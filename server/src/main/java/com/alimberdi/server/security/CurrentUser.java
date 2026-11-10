package com.alimberdi.server.security;

import java.util.Collection;
import java.util.Set;

/**
 * The team member behind a dashboard request, read from the access token.
 *
 * @param roles      the dashboard roles the token grants
 * @param tokenRoles every Keycloak role in the token, used for project access
 */
public record CurrentUser(
		String id,
		String username,
		String email,
		Set<UserRole> roles,
		Set<String> tokenRoles
) {

	public boolean isAdmin() {
		return roles.contains(UserRole.ADMIN);
	}

	public boolean hasAnyTokenRole(Collection<String> roleNames) {
		return roleNames.stream().anyMatch(tokenRoles::contains);
	}

}
