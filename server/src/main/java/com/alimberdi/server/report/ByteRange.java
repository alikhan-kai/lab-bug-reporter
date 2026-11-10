package com.alimberdi.server.report;

import com.alimberdi.server.exception.RangeNotSatisfiableException;
import org.springframework.http.HttpRange;

import java.util.List;

/**
 * The bytes of a file to send: the whole file, or the range a {@code Range} header asks for.
 *
 * @param start     first byte, inclusive
 * @param end       last byte, inclusive; {@code -1} for an empty file
 * @param isPartial whether the response is a 206 with only this range
 */
public record ByteRange(
		long start,
		long end,
		long fileSizeBytes,
		boolean isPartial
) {

	public long length() {
		return end - start + 1;
	}

	/** Reads a {@code Range} header, or takes the whole file when there is none. */
	public static ByteRange of(String rangeHeader, long fileSizeBytes) {
		if (rangeHeader == null || rangeHeader.isBlank()) {
			return new ByteRange(0, fileSizeBytes - 1, fileSizeBytes, false);
		}

		List<HttpRange> ranges;
		try {
			ranges = HttpRange.parseRanges(rangeHeader);
		} catch (IllegalArgumentException exception) {
			throw new RangeNotSatisfiableException(fileSizeBytes);
		}
		if (ranges.isEmpty()) {
			throw new RangeNotSatisfiableException(fileSizeBytes);
		}

		// A video player asks for one range to seek. Of several ranges only the first is sent, which HTTP allows.
		HttpRange range = ranges.getFirst();
		long start = range.getRangeStart(fileSizeBytes);
		long end = range.getRangeEnd(fileSizeBytes);
		if (start >= fileSizeBytes || start > end) {
			throw new RangeNotSatisfiableException(fileSizeBytes);
		}
		return new ByteRange(start, end, fileSizeBytes, true);
	}

}
