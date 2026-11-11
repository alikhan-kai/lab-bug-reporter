package com.alimberdi.server.dashboard;

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
public class DashboardConfigController {

	private final DashboardProperties dashboardProperties;

	@GetMapping
	public DashboardConfigResponse getDashboardConfig() {
		return DashboardConfigResponse.of(dashboardProperties);
	}

}
