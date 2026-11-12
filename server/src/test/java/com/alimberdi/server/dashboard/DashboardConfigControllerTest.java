package com.alimberdi.server.dashboard;

import com.alimberdi.server.project.ProjectRegistry;
import com.alimberdi.server.security.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DashboardConfigController.class)
@Import(SecurityConfig.class)
@TestPropertySource(properties = {
		"app.dashboard.oidc-issuer=https://auth.lab.example/realms/lab-bug-reporter",
		"app.dashboard.client-id=lab-dashboard"
})
class DashboardConfigControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private JwtDecoder jwtDecoder;

	// Needed by IngestCorsFilter, which the web slice picks up with every controller.
	@MockitoBean
	private ProjectRegistry projectRegistry;

	@Test
	void returnsLoginSettingsWithoutToken() throws Exception {
		mockMvc.perform(get("/api/v1/dashboard-config"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.keycloakUrl").value("https://auth.lab.example"))
				.andExpect(jsonPath("$.keycloakRealm").value("lab-bug-reporter"))
				.andExpect(jsonPath("$.keycloakClientId").value("lab-dashboard"));
	}

}
