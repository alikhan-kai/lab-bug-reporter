package com.alimberdi.server.dashboard;

public record DashboardConfigResponse(
		String keycloakUrl,
		String keycloakRealm,
		String keycloakClientId
) {

	public static DashboardConfigResponse of(DashboardProperties properties) {
		return new DashboardConfigResponse(properties.keycloakUrl(), properties.realm(), properties.clientId());
	}

}
