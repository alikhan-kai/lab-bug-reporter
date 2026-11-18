package com.alimberdi.server.report;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.Map;

/** How many reports have each status. The keys are the status values the API uses everywhere else. */
public record ReportStatusCountsResponse(
		@JsonProperty("new") long newCount,
		@JsonProperty("in_progress") long inProgressCount,
		@JsonProperty("resolved") long resolvedCount,
		@JsonProperty("wont_fix") long wontFixCount
) {

	public static ReportStatusCountsResponse of(Map<ReportStatus, Long> counts) {
		return new ReportStatusCountsResponse(
				counts.getOrDefault(ReportStatus.NEW, 0L),
				counts.getOrDefault(ReportStatus.IN_PROGRESS, 0L),
				counts.getOrDefault(ReportStatus.RESOLVED, 0L),
				counts.getOrDefault(ReportStatus.WONT_FIX, 0L)
		);
	}

}
