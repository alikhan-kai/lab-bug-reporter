package com.alimberdi.server.report;

import java.io.InputStream;

/** An opened attachment file. Whoever sends {@code content} closes it. */
public record AttachmentContent(
		String contentType,
		ByteRange range,
		InputStream content
) {
}
