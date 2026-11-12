package com.alimberdi.server.report;

import org.springframework.http.InvalidMediaTypeException;
import org.springframework.http.MediaType;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Turns the content type a browser sent with a file into one the response can carry. */
final class AttachmentMediaType {

	// Chrome records "video/webm;codecs=vp8,opus": a list of codecs that the standard wants in quotes.
	private static final Pattern UNQUOTED_CODECS = Pattern.compile("(codecs=)([^\";]+)");

	private AttachmentMediaType() {
	}

	static MediaType of(String contentType) {
		try {
			return MediaType.parseMediaType(contentType);
		} catch (InvalidMediaTypeException unquotedParameter) {
			try {
				return MediaType.parseMediaType(UNQUOTED_CODECS.matcher(contentType).replaceAll("$1\"$2\""));
			} catch (InvalidMediaTypeException stillInvalid) {
				// The parameters only help the player choose a decoder; the type alone still plays.
				return MediaType.parseMediaType(contentType.split(";", 2)[0].trim());
			}
		}
	}

}
