package com.alimberdi.server.report;

import com.alimberdi.server.exception.ResourceNotFoundException;
import com.alimberdi.server.project.Project;
import com.alimberdi.server.project.ProjectAccessService;
import com.alimberdi.server.security.CurrentUser;
import com.alimberdi.server.security.UserRole;
import com.alimberdi.server.storage.ObjectStorage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.zip.GZIPOutputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class ReportServiceTest {

	private static final Project DEMO = new Project("demo", "Demo website", "pk_demo", List.of(), List.of("team-demo"));
	private static final CurrentUser TRIAGER = new CurrentUser("user-1", "triager", null, Set.of(UserRole.TRIAGER), Set.of("triager", "team-demo"));

	private final ReportRepository reportRepository = mock(ReportRepository.class);
	private final ProjectAccessService projectAccessService = mock(ProjectAccessService.class);
	private final ObjectStorage objectStorage = mock(ObjectStorage.class);
	private final ReportService reportService = new ReportService(reportRepository, projectAccessService, objectStorage);

	@BeforeEach
	void setUpAccess() {
		when(projectAccessService.findVisible(TRIAGER)).thenReturn(List.of(DEMO));
		when(projectAccessService.findVisible(TRIAGER, "demo")).thenReturn(Optional.of(DEMO));
	}

	@Test
	void listsReportsWithProjectNameAndBadges() {
		Report report = report("demo");
		when(reportRepository.findAll(any(Specification.class), any(Pageable.class)))
				.thenAnswer(invocation -> new PageImpl<>(List.of(report), invocation.getArgument(1), 1));

		PageResponse<ReportSummaryResponse> page = reportService.findReports(TRIAGER, new ReportFilter(null, null, null, null), 0, 20);

		assertThat(page.totalElements()).isEqualTo(1);
		ReportSummaryResponse summary = page.content().getFirst();
		assertThat(summary.projectName()).isEqualTo("Demo website");
		assertThat(summary.hasVideo()).isTrue();
		assertThat(summary.screenshotCount()).isEqualTo(1);
		assertThat(summary.consoleErrorCount()).isEqualTo(2);
	}

	@Test
	void returnsEmptyPageForAProjectTheUserCannotSee() {
		PageResponse<ReportSummaryResponse> page = reportService.findReports(TRIAGER, new ReportFilter(Set.of("admin-only"), null, null, null), 0, 20);

		assertThat(page.content()).isEmpty();
		assertThat(page.size()).isEqualTo(20);
		verify(reportRepository, never()).findAll(any(Specification.class), any(Pageable.class));
	}

	@Test
	void hidesReportFromAProjectTheUserCannotSee() {
		Report report = report("admin-only");
		when(reportRepository.findWithAttachmentsById(report.getId())).thenReturn(Optional.of(report));

		assertThatThrownBy(() -> reportService.findReport(TRIAGER, report.getId()))
				.isInstanceOf(ResourceNotFoundException.class)
				.hasMessage("Report not found");
	}

	@Test
	void returnsDetailWithRecordingStartFromTheVideo() {
		Report report = givenStoredReport();

		ReportDetailResponse detail = reportService.findReport(TRIAGER, report.getId());

		assertThat(detail.recordingStartTime()).isEqualTo(1730801640120L);
		assertThat(detail.attachments()).extracting(AttachmentResponse::kind)
				.containsExactly(AttachmentKind.SCREENSHOT, AttachmentKind.VIDEO);
	}

	@Test
	void decompressesTheStoredContext() throws IOException {
		Report report = givenStoredReport();
		when(objectStorage.read(report.getContextObjectKey())).thenReturn(gzip("{\"console\":[]}"));

		byte[] context = reportService.readContext(TRIAGER, report.getId());

		assertThat(new String(context, StandardCharsets.UTF_8)).isEqualTo("{\"console\":[]}");
	}

	@Test
	void opensOnlyTheRequestedRangeOfAVideo() {
		Report report = givenStoredReport();
		Attachment video = report.getAttachments().get(1);
		when(objectStorage.open(video.getObjectKey(), 10, 99)).thenReturn(new ByteArrayInputStream(new byte[90]));

		AttachmentContent content = reportService.openAttachment(TRIAGER, report.getId(), video.getId(), "bytes=10-99");

		assertThat(content.contentType()).isEqualTo("video/webm");
		assertThat(content.range()).isEqualTo(new ByteRange(10, 99, 2048, true));
	}

	@Test
	void rejectsAttachmentOfAnotherReport() {
		Report report = givenStoredReport();

		assertThatThrownBy(() -> reportService.openAttachment(TRIAGER, report.getId(), UUID.randomUUID(), null))
				.isInstanceOf(ResourceNotFoundException.class)
				.hasMessage("Attachment not found");
		verifyNoInteractions(objectStorage);
	}

	@Test
	void changesStatus() {
		Report report = givenStoredReport();

		ReportDetailResponse detail = reportService.updateStatus(TRIAGER, report.getId(), ReportStatus.RESOLVED);

		assertThat(detail.status()).isEqualTo(ReportStatus.RESOLVED);
		verify(reportRepository).saveAndFlush(report);
	}

	@Test
	void deletesReportThenItsFiles() {
		Report report = givenStoredReport();

		reportService.deleteReport(TRIAGER, report.getId());

		verify(reportRepository).deleteById(report.getId());
		verify(objectStorage).deleteAll(List.of(
				report.getContextObjectKey(),
				report.getAttachments().get(0).getObjectKey(),
				report.getAttachments().get(1).getObjectKey()
		));
	}

	@Test
	void doesNotDeleteFilesOfAHiddenReport() {
		Report report = report("admin-only");
		when(reportRepository.findWithAttachmentsById(report.getId())).thenReturn(Optional.of(report));

		assertThatThrownBy(() -> reportService.deleteReport(TRIAGER, report.getId()))
				.isInstanceOf(ResourceNotFoundException.class);
		verify(reportRepository, never()).deleteById(any());
		verify(objectStorage, never()).deleteAll(any());
		verify(objectStorage, never()).read(anyString());
	}

	private Report givenStoredReport() {
		Report report = report("demo");
		when(reportRepository.findWithAttachmentsById(report.getId())).thenReturn(Optional.of(report));
		return report;
	}

	private Report report(String projectSlug) {
		UUID reportId = UUID.randomUUID();
		String prefix = projectSlug + "/" + reportId + "/";
		Report report = Report.builder()
				.id(reportId)
				.projectSlug(projectSlug)
				.type(ReportType.BUG)
				.title("Upload button does nothing")
				.pageUrl("http://localhost:5500/demo/")
				.reporterId("u-1842")
				.contextObjectKey(prefix + "context.json.gz")
				.consoleErrorCount(2)
				.failedRequestCount(1)
				.createdAt(Instant.parse("2026-11-10T09:00:00Z"))
				.build();
		report.addAttachment(Attachment.builder()
				.id(UUID.randomUUID())
				.kind(AttachmentKind.SCREENSHOT)
				.contentType("image/png")
				.sizeBytes(16)
				.objectKey(prefix + "screenshot")
				.build());
		report.addAttachment(Attachment.builder()
				.id(UUID.randomUUID())
				.kind(AttachmentKind.VIDEO)
				.contentType("video/webm")
				.sizeBytes(2048)
				.durationMs(5524L)
				.recordingStartTime(1730801640120L)
				.objectKey(prefix + "video")
				.build());
		return report;
	}

	private byte[] gzip(String text) throws IOException {
		ByteArrayOutputStream compressed = new ByteArrayOutputStream();
		try (GZIPOutputStream gzip = new GZIPOutputStream(compressed)) {
			gzip.write(text.getBytes(StandardCharsets.UTF_8));
		}
		return compressed.toByteArray();
	}

}
