package com.alimberdi.server.security;

import com.fasterxml.jackson.annotation.JsonProperty;

/** What a team member may do in the dashboard. */
public enum UserRole {
	@JsonProperty("admin") ADMIN,
	@JsonProperty("triager") TRIAGER,
	@JsonProperty("viewer") VIEWER;

	public String authority() {
		return "ROLE_" + name();
	}
}
