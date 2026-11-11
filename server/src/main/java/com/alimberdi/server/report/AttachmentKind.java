package com.alimberdi.server.report;

import com.fasterxml.jackson.annotation.JsonProperty;

public enum AttachmentKind {
	@JsonProperty("screenshot") SCREENSHOT,
	@JsonProperty("video") VIDEO
}
