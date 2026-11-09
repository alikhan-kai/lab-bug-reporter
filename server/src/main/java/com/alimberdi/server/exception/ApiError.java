package com.alimberdi.server.exception;

/** The JSON body of every error the API returns. */
public record ApiError(
		int status,
		String error,
		String message
) {
}
