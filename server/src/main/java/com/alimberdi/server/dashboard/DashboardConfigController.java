package com.alimberdi.server.dashboard;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Public settings the dashboard reads before login, so one image works on any hostname. */
@RestController
@RequiredArgsConstructor
@EnableConfigurationProperties(DashboardProperties.class)
@RequestMapping("/api/v1/dashboard-config")
@Tag(name = "Dashboard config")
public class DashboardConfigController {

	private final DashboardProperties dashboardProperties;

	@Operation(summary = "Keycloak settings the dashboard needs before login")
	@SecurityRequirements
	@GetMapping
	public DashboardConfigResponse getDashboardConfig() {
		return DashboardConfigResponse.of(dashboardProperties);
	}

}
