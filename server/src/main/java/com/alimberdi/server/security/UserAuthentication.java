package com.alimberdi.server.security;

import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

/** A request authenticated by a Keycloak token, with {@link CurrentUser} as its principal. */
public class UserAuthentication extends AbstractAuthenticationToken {

	private final CurrentUser user;
	private final Jwt token;

	public UserAuthentication(CurrentUser user, Jwt token) {
		super(user.roles().stream()
				.map(role -> new SimpleGrantedAuthority(role.authority()))
				.toList());
		this.user = user;
		this.token = token;
		setAuthenticated(true);
	}

	@Override
	public CurrentUser getPrincipal() {
		return user;
	}

	@Override
	public Jwt getCredentials() {
		return token;
	}

	@Override
	public String getName() {
		return user.id();
	}

}
