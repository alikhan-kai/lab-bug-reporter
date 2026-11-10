package com.alimberdi.server.report;

/** The website user who sent the report, as the website identified them. Unverified. */
public record ReporterResponse(
		String id,
		String email
) {

	static ReporterResponse of(Report report) {
		return new ReporterResponse(report.getReporterId(), report.getReporterEmail());
	}

}
