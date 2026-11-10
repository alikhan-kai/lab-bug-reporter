package com.alimberdi.server.security;

import org.junit.jupiter.api.Test;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class TokenUserConverterTest {

	private final TokenUserConverter converter = new TokenUserConverter(
			new AuthProperties(List.of("admin"), List.of("triager"), List.of("viewer"))
	);

	@Test
	void readsUserAndMapsRealmRolesToDashboardRoles() {
		Jwt token = token(Map.of("roles", List.of("triager", "team-demo", "offline_access")));

		UserAuthentication authentication = (UserAuthentication) converter.convert(token);

		CurrentUser user = authentication.getPrincipal();
		assertThat(user.id()).isEqualTo("user-1");
		assertThat(user.username()).isEqualTo("triager");
		assertThat(user.email()).isEqualTo("triager@lab.example");
		assertThat(user.roles()).containsExactly(UserRole.TRIAGER);
		assertThat(user.tokenRoles()).containsExactlyInAnyOrder("triager", "team-demo", "offline_access");
		assertThat(authentication.getAuthorities()).extracting(GrantedAuthority::getAuthority)
				.containsExactly("ROLE_TRIAGER");
		assertThat(authentication.isAuthenticated()).isTrue();
	}

	@Test
	void usesConfiguredRoleNames() {
		TokenUserConverter customConverter = new TokenUserConverter(
				new AuthProperties(List.of("lab-admin", "superuser"), List.of("lab-triager"), List.of("lab-viewer"))
		);

		UserAuthentication authentication = (UserAuthentication) customConverter.convert(token(Map.of("roles", List.of("superuser"))));

		assertThat(authentication.getPrincipal().roles()).containsExactly(UserRole.ADMIN);
	}

	@Test
	void givesNoRolesWhenTokenHasNoRealmRoles() {
		Jwt token = Jwt.withTokenValue("token")
				.header("alg", "RS256")
				.subject("user-1")
				.build();

		UserAuthentication authentication = (UserAuthentication) converter.convert(token);

		assertThat(authentication.getPrincipal().roles()).isEmpty();
		assertThat(authentication.getPrincipal().tokenRoles()).isEmpty();
		assertThat(authentication.getAuthorities()).isEmpty();
	}

	private Jwt token(Map<String, Object> realmAccess) {
		return Jwt.withTokenValue("token")
				.header("alg", "RS256")
				.subject("user-1")
				.claim("preferred_username", "triager")
				.claim("email", "triager@lab.example")
				.claim("realm_access", realmAccess)
				.build();
	}

}
