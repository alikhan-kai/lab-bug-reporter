package com.alimberdi.server.ingest;

import tools.jackson.databind.JsonNode;

import java.util.List;

/**
 * How many console errors and failed requests a captured context holds, for the badges in the report list.
 *
 * @param consoleErrorCount  console entries with level {@code error}
 * @param failedRequestCount network entries with a 4xx or 5xx status, or without a status because the request failed
 */
public record ContextCounts(
		int consoleErrorCount,
		int failedRequestCount
) {

	private static final int FIRST_ERROR_STATUS = 400;

	/** Counts the entries of a context sent by the SDK. Missing or malformed lists count as empty. */
	public static ContextCounts of(JsonNode context) {
		int consoleErrorCount = 0;
		for (JsonNode entry : entriesOf(context, "console")) {
			if ("error".equals(entry.path("level").stringValue(null))) {
				consoleErrorCount++;
			}
		}

		int failedRequestCount = 0;
		for (JsonNode entry : entriesOf(context, "network")) {
			if (isFailedRequest(entry)) {
				failedRequestCount++;
			}
		}
		return new ContextCounts(consoleErrorCount, failedRequestCount);
	}

	private static Iterable<JsonNode> entriesOf(JsonNode context, String listName) {
		JsonNode list = context.path(listName);
		return list.isArray() ? list : List.of();
	}

	// A request without a status either failed or was still running when the report was sent.
	private static boolean isFailedRequest(JsonNode entry) {
		JsonNode status = entry.path("status");
		if (status.isNumber()) {
			return status.intValue() >= FIRST_ERROR_STATUS;
		}
		return !entry.path("pending").asBoolean(false);
	}

}
