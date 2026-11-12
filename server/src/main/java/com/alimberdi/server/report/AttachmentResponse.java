package com.alimberdi.server.report;

import java.util.UUID;

/** A screenshot or video of a report. The bytes come from the attachment endpoint. */
public record AttachmentResponse(
		UUID id,
		AttachmentKind kind,
		String contentType,
		long sizeBytes,
		Long durationMs,
		Long recordingStartTime
) {

	static AttachmentResponse of(Attachment attachment) {
		return new AttachmentResponse(
				attachment.getId(),
				attachment.getKind(),
				attachment.getContentType(),
				attachment.getSizeBytes(),
				attachment.getDurationMs(),
				attachment.getRecordingStartTime()
		);
	}

}
