package com.alimberdi.server.report;

import com.alimberdi.server.project.Project;

import java.time.Instant;
import java.util.UUID;

/** A row of the report list, with the counts the list shows as badges. */
public record ReportSummaryResponse(
		UUID id,
		String projectSlug,
		String projectName,
		ReportType type,
		String title,
		ReportStatus status,
		String pageUrl,
		ReporterResponse reporter,
		boolean hasVideo,
		int screenshotCount,
		int consoleErrorCount,
		int failedRequestCount,
		Instant createdAt
) {

	static ReportSummaryResponse of(Report report, Project project) {
		long screenshotCount = report.getAttachments().stream()
				.filter(attachment -> attachment.getKind() == AttachmentKind.SCREENSHOT)
				.count();
		boolean hasVideo = report.getAttachments().stream()
				.anyMatch(attachment -> attachment.getKind() == AttachmentKind.VIDEO);
		return new ReportSummaryResponse(
				report.getId(),
				project.slug(),
				project.name(),
				report.getType(),
				report.getTitle(),
				report.getStatus(),
				report.getPageUrl(),
				ReporterResponse.of(report),
				hasVideo,
				(int) screenshotCount,
				report.getConsoleErrorCount(),
				report.getFailedRequestCount(),
				report.getCreatedAt()
		);
	}

}
