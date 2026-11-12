package com.alimberdi.server.report;

import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Locale;

/** Builds the query of the report list. */
final class ReportSpecifications {

	private static final char LIKE_ESCAPE = '\\';

	private ReportSpecifications() {
	}

	/** Reports from the given projects that match the statuses, types and text search of the filter. */
	static Specification<Report> matching(ReportFilter filter, Collection<String> projectSlugs) {
		return (root, query, builder) -> {
			List<Predicate> predicates = new ArrayList<>();
			predicates.add(root.get("projectSlug").in(projectSlugs));
			if (!filter.statuses().isEmpty()) {
				predicates.add(root.get("status").in(filter.statuses()));
			}
			if (!filter.types().isEmpty()) {
				predicates.add(root.get("type").in(filter.types()));
			}
			if (filter.hasQuery()) {
				String pattern = "%" + escapeLike(filter.query().trim().toLowerCase(Locale.ROOT)) + "%";
				predicates.add(builder.or(
						builder.like(builder.lower(root.get("title")), pattern, LIKE_ESCAPE),
						builder.like(builder.lower(root.get("description")), pattern, LIKE_ESCAPE)
				));
			}
			return builder.and(predicates.toArray(Predicate[]::new));
		};
	}

	/**
	 * Orders the list for triage: new reports first, then in progress, resolved and won't fix, newest first within
	 * each status. It filters nothing.
	 */
	static Specification<Report> inTriageOrder() {
		return (root, query, builder) -> {
			// The count query of a page has no order.
			if (Long.class.equals(query.getResultType())) {
				return null;
			}
			Expression<Integer> statusRank = builder.<Integer>selectCase()
					.when(builder.equal(root.get("status"), ReportStatus.NEW), 0)
					.when(builder.equal(root.get("status"), ReportStatus.IN_PROGRESS), 1)
					.when(builder.equal(root.get("status"), ReportStatus.RESOLVED), 2)
					.otherwise(3);
			query.orderBy(builder.asc(statusRank), builder.desc(root.get("createdAt")), builder.desc(root.get("id")));
			return null;
		};
	}

	// Without escaping, a search for "100%" would match every title that contains "100".
	private static String escapeLike(String text) {
		return text
				.replace("\\", "\\\\")
				.replace("%", "\\%")
				.replace("_", "\\_");
	}

}
