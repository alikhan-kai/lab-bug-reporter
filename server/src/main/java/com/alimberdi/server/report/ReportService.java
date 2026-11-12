package com.alimberdi.server.report;

import com.alimberdi.server.exception.ResourceNotFoundException;
import com.alimberdi.server.project.Project;
import com.alimberdi.server.project.ProjectAccessService;
import com.alimberdi.server.security.CurrentUser;
import com.alimberdi.server.storage.ObjectStorage;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.zip.GZIPInputStream;

/**
 * Reads and changes reports for the dashboard. A report from a project the user cannot see is answered
 * as not found, so that its existence does not leak.
 */
@Service
@RequiredArgsConstructor
public class ReportService {

	// The id breaks ties between reports created in the same instant, so that pages do not overlap.

	private final ReportRepository reportRepository;
	private final ProjectAccessService projectAccessService;
	private final ObjectStorage objectStorage;

	/** Lists the reports of the projects the user can see, newest first. */
	@Transactional(readOnly = true)
	public PageResponse<ReportSummaryResponse> findReports(CurrentUser user, ReportFilter filter, int page, int size) {
		// The order comes from the specification, which sorts by status before time.
		Pageable pageable = PageRequest.of(page, size);
		Map<String, Project> projectsBySlug = findSearchedProjects(user, filter.projectSlugs());
		if (projectsBySlug.isEmpty()) {
			return PageResponse.of(Page.empty(pageable));
		}

		Page<Report> reports = reportRepository.findAll(
				ReportSpecifications.matching(filter, projectsBySlug.keySet()).and(ReportSpecifications.inTriageOrder()),
				pageable
		);
		return PageResponse.of(reports.map(report -> ReportSummaryResponse.of(report, projectsBySlug.get(report.getProjectSlug()))));
	}

	@Transactional(readOnly = true)
	public ReportDetailResponse findReport(CurrentUser user, UUID reportId) {
		VisibleReport visibleReport = findVisibleReport(user, reportId);
		return ReportDetailResponse.of(visibleReport.report(), visibleReport.project());
	}

	/** Returns the console, network and breadcrumbs of the report as the JSON the SDK sent. */
	public byte[] readContext(CurrentUser user, UUID reportId) {
		Report report = findVisibleReport(user, reportId).report();
		return decompress(objectStorage.read(report.getContextObjectKey()));
	}

	/** Opens a screenshot or video, or the part of it that {@code rangeHeader} asks for. */
	public AttachmentContent openAttachment(CurrentUser user, UUID reportId, UUID attachmentId, String rangeHeader) {
		Attachment attachment = findVisibleReport(user, reportId).report().getAttachments().stream()
				.filter(candidate -> candidate.getId().equals(attachmentId))
				.findFirst()
				.orElseThrow(() -> new ResourceNotFoundException("Attachment not found"));

		ByteRange range = ByteRange.of(rangeHeader, attachment.getSizeBytes());
		return new AttachmentContent(attachment.getContentType(), range, openObject(attachment.getObjectKey(), range));
	}

	@Transactional
	public ReportDetailResponse updateStatus(CurrentUser user, UUID reportId, ReportStatus status) {
		VisibleReport visibleReport = findVisibleReport(user, reportId);
		Report report = visibleReport.report();
		report.changeStatus(status);
		// Flushing runs the auditing listener, so the response carries the new updatedAt.
		reportRepository.saveAndFlush(report);
		return ReportDetailResponse.of(report, visibleReport.project());
	}

	/** Deletes the report, then its files. A file that fails to delete is left behind and logged. */
	public void deleteReport(CurrentUser user, UUID reportId) {
		Report report = findVisibleReport(user, reportId).report();
		reportRepository.deleteById(report.getId());
		objectStorage.deleteAll(objectKeysOf(report));
	}

	// Projects the user cannot see are dropped, so asking for one gives an empty page, not an error.
	private Map<String, Project> findSearchedProjects(CurrentUser user, Set<String> projectSlugs) {
		return projectAccessService.findVisible(user).stream()
				.filter(project -> projectSlugs.isEmpty() || projectSlugs.contains(project.slug()))
				.collect(Collectors.toMap(Project::slug, Function.identity()));
	}

	private VisibleReport findVisibleReport(CurrentUser user, UUID reportId) {
		Report report = reportRepository.findWithAttachmentsById(reportId)
				.orElseThrow(ReportService::reportNotFound);
		Project project = projectAccessService.findVisible(user, report.getProjectSlug())
				.orElseThrow(ReportService::reportNotFound);
		return new VisibleReport(report, project);
	}

	private static ResourceNotFoundException reportNotFound() {
		return new ResourceNotFoundException("Report not found");
	}

	private InputStream openObject(String objectKey, ByteRange range) {
		if (range.length() == 0) {
			return new ByteArrayInputStream(new byte[0]);
		}
		return range.isPartial()
				? objectStorage.open(objectKey, range.start(), range.end())
				: objectStorage.open(objectKey);
	}

	private byte[] decompress(byte[] compressed) {
		try (InputStream json = new GZIPInputStream(new ByteArrayInputStream(compressed))) {
			return json.readAllBytes();
		} catch (IOException exception) {
			throw new UncheckedIOException("Cannot decompress the report context", exception);
		}
	}

	private List<String> objectKeysOf(Report report) {
		List<String> objectKeys = new ArrayList<>();
		objectKeys.add(report.getContextObjectKey());
		report.getAttachments().forEach(attachment -> objectKeys.add(attachment.getObjectKey()));
		return objectKeys;
	}

	private record VisibleReport(Report report, Project project) {
	}

}
