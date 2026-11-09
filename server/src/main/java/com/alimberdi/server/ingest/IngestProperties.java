package com.alimberdi.server.ingest;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("app.ingest")
public record IngestProperties(
		int maxVideoSeconds,
		int maxVideoMb,
		int maxScreenshotMb,
		int maxScreenshots,
		int maxContextMb
) {

	private static final long BYTES_IN_MEGABYTE = 1024 * 1024;

	public long maxVideoBytes() {
		return maxVideoMb * BYTES_IN_MEGABYTE;
	}

	public long maxScreenshotBytes() {
		return maxScreenshotMb * BYTES_IN_MEGABYTE;
	}

	public long maxContextBytes() {
		return maxContextMb * BYTES_IN_MEGABYTE;
	}

}
