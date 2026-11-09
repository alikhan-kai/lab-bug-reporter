package com.alimberdi.server.ingest;

import com.alimberdi.server.exception.InvalidReportException;
import com.alimberdi.server.exception.OriginNotAllowedException;
import com.alimberdi.server.exception.PayloadTooLargeException;
import com.alimberdi.server.exception.ResourceNotFoundException;
import com.alimberdi.server.exception.StorageException;
import com.alimberdi.server.project.Project;
import com.alimberdi.server.project.ProjectRegistry;
import com.alimberdi.server.report.AttachmentKind;
import com.alimberdi.server.report.Report;
import com.alimberdi.server.report.ReportPayload;
import com.alimberdi.server.report.ReportRepository;
import com.alimberdi.server.report.ReportStatus;
import com.alimberdi.server.report.ReportType;
import com.alimberdi.server.report.ReporterPayload;
import com.alimberdi.server.storage.ObjectStorage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.json.JsonMapper;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class IngestServiceTest {

	private static final String PROJECT_KEY = "pk_demo";
	private static final String ORIGIN = "http://localhost:3000";

	private final ProjectRegistry projectRegistry = mock(ProjectRegistry.class);
	private final ObjectStorage objectStorage = mock(ObjectStorage.class);
	private final ReportRepository reportRepository = mock(ReportRepository.class);
	private final IngestProperties properties = new IngestProperties(300, 1, 1, 2, 1);
	private final IngestService ingestService = new IngestService(
			projectRegistry,
			new IngestLimitsValidator(properties),
			objectStorage,
			reportRepository,
			JsonMapper.builder().build()
	);

	@BeforeEach
	void setUpProject() {
		Project project = new Project("demo", "Demo", PROJECT_KEY, List.of(ORIGIN), List.of());
		when(projectRegistry.findByKey(PROJECT_KEY)).thenReturn(Optional.of(project));
	}

	@Test
	void storesFilesThenSavesReportWithAttachments() {
		IngestResponse response = ingest(context(), List.of(screenshot()), video(), 1000L);

		ArgumentCaptor<Report> savedReport = ArgumentCaptor.forClass(Report.class);
		verify(reportRepository).save(savedReport.capture());
		Report report = savedReport.getValue();

		assertThat(report.getId()).isEqualTo(response.reportId());
		assertThat(report.getProjectSlug()).isEqualTo("demo");
		assertThat(report.getStatus()).isEqualTo(ReportStatus.NEW);
		assertThat(report.getContextObjectKey()).isEqualTo("demo/" + response.reportId() + "/context.json.gz");
		assertThat(report.getAttachments()).extracting("kind")
				.containsExactly(AttachmentKind.SCREENSHOT, AttachmentKind.VIDEO);
		assertThat(report.getAttachments().get(1).getDurationMs()).isEqualTo(1000L);
		verify(objectStorage).put(eq(report.getContextObjectKey()), any(), anyLong(), eq("application/gzip"));
	}

	@Test
	void rejectsUnknownProjectKey() {
		when(projectRegistry.findByKey(PROJECT_KEY)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> ingest(context(), null, null, null))
				.isInstanceOf(ResourceNotFoundException.class);
	}

	@Test
	void rejectsOriginOutsideTheProject() {
		assertThatThrownBy(() -> ingestService.ingest(PROJECT_KEY, "https://evil.example", payload(null), context(), null, null))
				.isInstanceOf(OriginNotAllowedException.class);
		verifyNothingStored();
	}

	@Test
	void rejectsTooManyScreenshots() {
		assertThatThrownBy(() -> ingest(context(), List.of(screenshot(), screenshot(), screenshot()), null, null))
				.isInstanceOf(PayloadTooLargeException.class);
		verifyNothingStored();
	}

	@Test
	void rejectsOversizedVideo() {
		MultipartFile video = new MockMultipartFile("video", "v.webm", "video/webm", new byte[1024 * 1024 + 1]);

		assertThatThrownBy(() -> ingest(context(), null, video, 1000L))
				.isInstanceOf(PayloadTooLargeException.class);
		verifyNothingStored();
	}

	@Test
	void rejectsVideoLongerThanTheLimit() {
		assertThatThrownBy(() -> ingest(context(), null, video(), 306_000L))
				.isInstanceOf(PayloadTooLargeException.class);
		verifyNothingStored();
	}

	@Test
	void acceptsVideoStoppedAtTheLimitWithSmallOverrun() {
		ingest(context(), null, video(), 300_500L);

		verify(reportRepository).save(any());
	}

	@Test
	void rejectsScreenshotThatIsNotAnImage() {
		MultipartFile file = new MockMultipartFile("screenshots", "s.html", "text/html", new byte[1]);

		assertThatThrownBy(() -> ingest(context(), List.of(file), null, null))
				.isInstanceOf(InvalidReportException.class);
		verifyNothingStored();
	}

	@Test
	void rejectsContextThatIsNotJson() {
		MultipartFile context = new MockMultipartFile("context", "c.json", "application/json", "not json".getBytes());

		assertThatThrownBy(() -> ingest(context, null, null, null))
				.isInstanceOf(InvalidReportException.class);
		verifyNothingStored();
	}

	@Test
	void removesStoredObjectsWhenAnUploadFails() {
		doThrow(new StorageException("down", null))
				.when(objectStorage).put(anyString(), any(), anyLong(), eq("video/webm"));

		assertThatThrownBy(() -> ingest(context(), null, video(), 1000L))
				.isInstanceOf(StorageException.class);

		ArgumentCaptor<List<String>> deletedKeys = ArgumentCaptor.captor();
		verify(objectStorage).deleteAll(deletedKeys.capture());
		assertThat(deletedKeys.getValue()).hasSize(2);
		verify(reportRepository, never()).save(any());
	}

	private IngestResponse ingest(MultipartFile context, List<MultipartFile> screenshots, MultipartFile video, Long durationMs) {
		return ingestService.ingest(PROJECT_KEY, ORIGIN, payload(durationMs), context, screenshots, video);
	}

	private void verifyNothingStored() {
		verify(objectStorage, never()).put(anyString(), any(), anyLong(), anyString());
		verify(reportRepository, never()).save(any());
	}

	private ReportPayload payload(Long durationMs) {
		return new ReportPayload(
				ReportType.BUG, "Title", "Description", "http://localhost:3000/page",
				new ReporterPayload("u-1", null), Map.of("browser", "Chrome"), Map.of(),
				durationMs, 1730801640120L
		);
	}

	private MultipartFile context() {
		return new MockMultipartFile("context", "context.json", "application/json", "{\"console\":[]}".getBytes());
	}

	private MultipartFile screenshot() {
		return new MockMultipartFile("screenshots", "s.png", "image/png", new byte[16]);
	}

	private MultipartFile video() {
		return new MockMultipartFile("video", "v.webm", "video/webm", new byte[16]);
	}

}
