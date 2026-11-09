package com.alimberdi.server.report;

import com.fasterxml.jackson.annotation.JsonProperty;

public enum ReportStatus {
	@JsonProperty("new") NEW,
	@JsonProperty("in_progress") IN_PROGRESS,
	@JsonProperty("resolved") RESOLVED,
	@JsonProperty("wont_fix") WONT_FIX
}
