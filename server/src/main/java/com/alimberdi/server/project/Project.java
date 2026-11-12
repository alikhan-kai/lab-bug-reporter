package com.alimberdi.server.project;

import java.util.List;

/** A lab website that may submit reports, as defined in the projects file. */
public record Project(
		String slug,
		String name,
		String key,
		List<String> allowedOrigins,
		List<String> access
) {

	// A project without an access list is visible to admins only.
	public Project {
		access = access != null ? List.copyOf(access) : List.of();
	}

	public boolean isOriginAllowed(String origin) {
		return origin != null && allowedOrigins.contains(origin);
	}

}
