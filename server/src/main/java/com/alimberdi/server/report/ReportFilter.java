package com.alimberdi.server.report;

/** Filters of the report list. A {@code null} field does not filter. */
public record ReportFilter(
		String projectSlug,
		ReportStatus status,
		ReportType type,
		String query
) {

	public boolean hasQuery() {
		return query != null && !query.isBlank();
	}

}
