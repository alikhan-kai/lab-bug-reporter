package com.alimberdi.server.report;

import jakarta.validation.constraints.NotNull;

public record UpdateReportRequest(
		@NotNull ReportStatus status
) {
}
