package com.alimberdi.server.report;

import com.fasterxml.jackson.annotation.JsonProperty;

public enum ReportType {
	@JsonProperty("bug") BUG,
	@JsonProperty("feature") FEATURE,
	@JsonProperty("question") QUESTION
}
