package com.alimberdi.server.exception;

import lombok.Getter;

/** A Range header that cannot be served for a file of {@code fileSizeBytes}. */
@Getter
public class RangeNotSatisfiableException extends RuntimeException {

	private final long fileSizeBytes;

	public RangeNotSatisfiableException(long fileSizeBytes) {
		super("The requested range is outside the file");
		this.fileSizeBytes = fileSizeBytes;
	}

}
