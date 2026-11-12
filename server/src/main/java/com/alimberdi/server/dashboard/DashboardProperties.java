package com.alimberdi.server.dashboard;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Where the dashboard sends the user to log in. The same token issuer the API checks, so the hostname is set once
 * through {@code OIDC_ISSUER} and the dashboard build does not depend on it.
 */
@ConfigurationProperties("app.dashboard")
public record DashboardProperties(
		String oidcIssuer,
		String clientId
) {

	private static final String REALMS_PATH = "/realms/";

	public DashboardProperties {
		if (oidcIssuer == null || !oidcIssuer.contains(REALMS_PATH)) {
			throw new IllegalStateException("OIDC issuer must be a Keycloak realm URL like https://host/realms/name");
		}
	}

	/** The Keycloak base URL, the part of the issuer before {@code /realms/}. */
	public String keycloakUrl() {
		return oidcIssuer.substring(0, oidcIssuer.lastIndexOf(REALMS_PATH));
	}

	public String realm() {
		return oidcIssuer.substring(oidcIssuer.lastIndexOf(REALMS_PATH) + REALMS_PATH.length());
	}

}
