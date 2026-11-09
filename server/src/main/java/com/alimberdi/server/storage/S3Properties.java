package com.alimberdi.server.storage;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("app.s3")
public record S3Properties(
		String endpoint,
		String bucket,
		String accessKey,
		String secretKey,
		String region,
		boolean forcePathStyle
) {
}
