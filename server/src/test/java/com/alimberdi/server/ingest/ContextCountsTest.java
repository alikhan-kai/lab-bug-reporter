package com.alimberdi.server.ingest;

import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

import static org.assertj.core.api.Assertions.assertThat;

class ContextCountsTest {

	private final JsonMapper jsonMapper = JsonMapper.builder().build();

	@Test
	void countsConsoleErrorsOnly() {
		ContextCounts counts = count("""
				{ "console": [
					{ "level": "error", "message": "boom" },
					{ "level": "warn", "message": "careful" },
					{ "level": "error", "message": "again" }
				] }
				""");

		assertThat(counts.consoleErrorCount()).isEqualTo(2);
	}

	@Test
	void countsErrorStatusesAndRequestsThatFailedWithoutStatus() {
		ContextCounts counts = count("""
				{ "network": [
					{ "status": 200 },
					{ "status": 404 },
					{ "status": 500 },
					{ "status": null, "error": "Network error" },
					{ "status": null, "pending": true }
				] }
				""");

		assertThat(counts.failedRequestCount()).isEqualTo(3);
	}

	@Test
	void treatsMissingOrMalformedListsAsEmpty() {
		ContextCounts counts = count("""
				{ "console": "not a list", "network": { "status": 500 } }
				""");

		assertThat(counts).isEqualTo(new ContextCounts(0, 0));
	}

	private ContextCounts count(String json) {
		return ContextCounts.of(jsonMapper.readTree(json));
	}

}
