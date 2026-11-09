package com.alimberdi.server.ingest;

import com.alimberdi.server.exception.InvalidReportException;
import com.alimberdi.server.exception.PayloadTooLargeException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/** Checks submitted files against the configured limits. */
@Component
@RequiredArgsConstructor
public class IngestLimitsValidator {

	// The recorder stops itself at the limit, and its reported duration can run slightly over.
	private static final long DURATION_TOLERANCE_MS = 5000;

	private final IngestProperties properties;

	public void checkScreenshots(List<MultipartFile> screenshots) {
		if (screenshots.size() > properties.maxScreenshots()) {
			throw new PayloadTooLargeException("A report can have at most " + properties.maxScreenshots() + " screenshots");
		}
		for (MultipartFile screenshot : screenshots) {
			checkContentType(screenshot, "image/");
			if (screenshot.getSize() > properties.maxScreenshotBytes()) {
				throw new PayloadTooLargeException("A screenshot can be at most " + properties.maxScreenshotMb() + " MB");
			}
		}
	}

	public void checkVideo(MultipartFile video, Long durationMs) {
		checkContentType(video, "video/");
		if (video.getSize() > properties.maxVideoBytes()) {
			throw new PayloadTooLargeException("A video can be at most " + properties.maxVideoMb() + " MB");
		}
		if (durationMs != null && durationMs > properties.maxVideoSeconds() * 1000L + DURATION_TOLERANCE_MS) {
			throw new PayloadTooLargeException("A video can be at most " + properties.maxVideoSeconds() + " seconds long");
		}
	}

	public void checkCompressedContext(long sizeBytes) {
		if (sizeBytes > properties.maxContextBytes()) {
			throw new PayloadTooLargeException("Context can be at most " + properties.maxContextMb() + " MB compressed");
		}
	}

	private void checkContentType(MultipartFile file, String expectedPrefix) {
		String contentType = file.getContentType();
		if (contentType == null || !contentType.startsWith(expectedPrefix)) {
			throw new InvalidReportException("File " + file.getName() + " must have a content type starting with " + expectedPrefix);
		}
	}

}
