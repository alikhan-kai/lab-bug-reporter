package com.alimberdi.server.security;

import lombok.RequiredArgsConstructor;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.Collection;
import java.util.Collections;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/** Turns a validated Keycloak access token into the dashboard user and their roles. */
@RequiredArgsConstructor
public class TokenUserConverter implements Converter<Jwt, AbstractAuthenticationToken> {

	private static final String REALM_ACCESS_CLAIM = "realm_access";
	private static final String ROLES_KEY = "roles";
	private static final String USERNAME_CLAIM = "preferred_username";
	private static final String EMAIL_CLAIM = "email";

	private final AuthProperties authProperties;

	@Override
	public AbstractAuthenticationToken convert(Jwt token) {
		Set<String> tokenRoles = readRealmRoles(token);
		CurrentUser user = new CurrentUser(
				token.getSubject(),
				token.getClaimAsString(USERNAME_CLAIM),
				token.getClaimAsString(EMAIL_CLAIM),
				mapToUserRoles(tokenRoles),
				tokenRoles
		);
		return new UserAuthentication(user, token);
	}

	private Set<String> readRealmRoles(Jwt token) {
		Map<String, Object> realmAccess = token.getClaimAsMap(REALM_ACCESS_CLAIM);
		if (realmAccess == null || !(realmAccess.get(ROLES_KEY) instanceof Collection<?> roles)) {
			return Set.of();
		}
		return roles.stream()
				.map(String::valueOf)
				.collect(Collectors.toUnmodifiableSet());
	}

	private Set<UserRole> mapToUserRoles(Set<String> tokenRoles) {
		Set<UserRole> roles = EnumSet.noneOf(UserRole.class);
		for (UserRole role : UserRole.values()) {
			if (authProperties.tokenRolesFor(role).stream().anyMatch(tokenRoles::contains)) {
				roles.add(role);
			}
		}
		return Collections.unmodifiableSet(roles);
	}

}
