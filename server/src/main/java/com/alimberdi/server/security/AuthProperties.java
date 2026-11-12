package com.alimberdi.server.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/** Which Keycloak roles grant each dashboard role. */
@ConfigurationProperties("app.auth")
public record AuthProperties(
		List<String> adminRoles,
		List<String> triagerRoles,
		List<String> viewerRoles
) {

	public List<String> tokenRolesFor(UserRole role) {
		return switch (role) {
			case ADMIN -> adminRoles;
			case TRIAGER -> triagerRoles;
			case VIEWER -> viewerRoles;
		};
	}

}
