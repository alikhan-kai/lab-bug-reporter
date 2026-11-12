package com.alimberdi.server.report;

import java.util.Collection;
import java.util.Set;

/**
 * Filters of the report list. Each set keeps the reports that match any of its values; an empty set does not
 * filter, the same as no checkbox ticked in the dashboard.
 */
public record ReportFilter(
		Set<String> projectSlugs,
		Set<ReportStatus> statuses,
		Set<ReportType> types,
		String query
) {

	public ReportFilter {
		projectSlugs = copyOf(projectSlugs);
		statuses = copyOf(statuses);
		types = copyOf(types);
	}

	public boolean hasQuery() {
		return query != null && !query.isBlank();
	}

	private static <T> Set<T> copyOf(Collection<T> values) {
		return values == null ? Set.of() : Set.copyOf(values);
	}

}
