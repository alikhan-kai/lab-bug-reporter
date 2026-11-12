package com.alimberdi.server.report;

import com.alimberdi.server.project.Project;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * A whole report except its captured context, which comes from the context endpoint.
 *
 * @param recordingStartTime when the video started, in epoch milliseconds; the dashboard shows log times relative to it
 */
public record ReportDetailResponse(
		UUID id,
		String projectSlug,
		String projectName,
		ReportType type,
		String title,
		String description,
		ReportStatus status,
		String pageUrl,
		ReporterResponse reporter,
		Map<String, Object> environment,
		Map<String, Object> hostMetadata,
		List<AttachmentResponse> attachments,
		Long recordingStartTime,
		int consoleErrorCount,
		int failedRequestCount,
		Instant createdAt,
		Instant updatedAt
) {

	static ReportDetailResponse of(Report report, Project project) {
		Long recordingStartTime = report.getAttachments().stream()
				.filter(attachment -> attachment.getKind() == AttachmentKind.VIDEO)
				.map(Attachment::getRecordingStartTime)
				.findFirst()
				.orElse(null);
		return new ReportDetailResponse(
				report.getId(),
				project.slug(),
				project.name(),
				report.getType(),
				report.getTitle(),
				report.getDescription(),
				report.getStatus(),
				report.getPageUrl(),
				ReporterResponse.of(report),
				report.getEnvironment(),
				report.getHostMetadata(),
				report.getAttachments().stream().map(AttachmentResponse::of).toList(),
				recordingStartTime,
				report.getConsoleErrorCount(),
				report.getFailedRequestCount(),
				report.getCreatedAt(),
				report.getUpdatedAt()
		);
	}

}
