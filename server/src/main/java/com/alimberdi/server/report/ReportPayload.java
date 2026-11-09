package com.alimberdi.server.report;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.util.Map;

public record ReportPayload(
		@NotNull ReportType type,
		@NotBlank @Size(max = 300) String title,
		@Size(max = 20000) String description,
		@NotBlank @Size(max = 2048) String pageUrl,
		@NotNull @Valid ReporterPayload reporter,
		Map<String, Object> environment,
		Map<String, Object> hostMetadata,
		@Positive Long videoDurationMs,
		@Positive Long recordingStartTime
) {
}
