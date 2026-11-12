package com.alimberdi.server.config;

import com.alimberdi.server.dashboard.DashboardConfigController;
import com.alimberdi.server.project.ProjectRegistry;
import com.alimberdi.server.security.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DashboardConfigController.class)
@Import({SecurityConfig.class, WebConfig.class})
@TestPropertySource(properties = "app.dashboard.oidc-issuer=http://localhost:8081/realms/lab-bug-reporter")
class WebConfigTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private JwtDecoder jwtDecoder;

	// Needed by IngestCorsFilter, which the web slice picks up with every controller.
	@MockitoBean
	private ProjectRegistry projectRegistry;

	@Test
	void letsAnyWebsiteLoadTheWidgetFont() throws Exception {
		mockMvc.perform(get("/sdk-fonts/test-font.woff2").header(HttpHeaders.ORIGIN, "https://datasets.lab.example"))
				.andExpect(status().isOk())
				.andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "*"));
	}

	@Test
	void keepsTheRestOfTheServiceWithoutOpenCors() throws Exception {
		mockMvc.perform(get("/api/v1/dashboard-config").header(HttpHeaders.ORIGIN, "https://datasets.lab.example"))
				.andExpect(status().isOk())
				.andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
	}

}
