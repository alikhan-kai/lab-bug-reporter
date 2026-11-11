package com.alimberdi.server.config;

import com.alimberdi.server.dashboard.DashboardConfigController;
import com.alimberdi.server.ingest.IngestController;
import com.alimberdi.server.ingest.IngestService;
import com.alimberdi.server.project.ProjectAccessService;
import com.alimberdi.server.project.ProjectRegistry;
import com.alimberdi.server.report.ReportController;
import com.alimberdi.server.report.ReportService;
import com.alimberdi.server.security.SecurityConfig;
import com.alimberdi.server.user.MeController;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.empty;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest({IngestController.class, ReportController.class, MeController.class, DashboardConfigController.class})
@Import({SecurityConfig.class, OpenApiConfig.class, WebConfig.class})
@ImportAutoConfiguration(classes = {
		org.springdoc.core.configuration.SpringDocConfiguration.class,
		org.springdoc.webmvc.core.configuration.SpringDocWebMvcConfiguration.class,
		org.springdoc.webmvc.core.configuration.MultipleOpenApiSupportConfiguration.class,
		org.springdoc.core.properties.SpringDocConfigProperties.class
})
@TestPropertySource(properties = "app.dashboard.oidc-issuer=http://localhost:8081/realms/lab-bug-reporter")
class OpenApiConfigTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private JwtDecoder jwtDecoder;

	@MockitoBean
	private ProjectRegistry projectRegistry;

	@MockitoBean
	private ProjectAccessService projectAccessService;

	@MockitoBean
	private IngestService ingestService;

	@MockitoBean
	private ReportService reportService;

	@Test
	void describesEveryEndpointWithoutToken() throws Exception {
		mockMvc.perform(get("/v3/api-docs"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.paths['/api/v1/ingest/{projectKey}/reports'].post").exists())
				.andExpect(jsonPath("$.paths['/api/v1/reports'].get").exists())
				.andExpect(jsonPath("$.paths['/api/v1/reports/{reportId}'].patch").exists())
				.andExpect(jsonPath("$.paths['/api/v1/reports/{reportId}'].delete").exists())
				.andExpect(jsonPath("$.paths['/api/v1/reports/{reportId}/context'].get").exists())
				.andExpect(jsonPath("$.paths['/api/v1/reports/{reportId}/attachments/{attachmentId}'].get").exists())
				.andExpect(jsonPath("$.paths['/api/v1/me'].get").exists())
				.andExpect(jsonPath("$.paths['/api/v1/dashboard-config'].get").exists());
	}

	@Test
	void marksOnlyIngestAndDashboardConfigAsPublic() throws Exception {
		mockMvc.perform(get("/v3/api-docs"))
				.andExpect(jsonPath("$.security[0].keycloak").exists())
				.andExpect(jsonPath("$.paths['/api/v1/ingest/{projectKey}/reports'].post.security").value(empty()))
				.andExpect(jsonPath("$.paths['/api/v1/dashboard-config'].get.security").value(empty()))
				.andExpect(jsonPath("$.paths['/api/v1/reports'].get.security").doesNotExist());
	}

	@Test
	void documentsErrorsInTheApiFormat() throws Exception {
		mockMvc.perform(get("/v3/api-docs"))
				.andExpect(jsonPath("$.components.schemas.ApiError.properties.message").exists())
				.andExpect(jsonPath("$.paths['/api/v1/ingest/{projectKey}/reports'].post.responses['413']").exists())
				.andExpect(jsonPath("$.paths['/api/v1/reports/{reportId}'].patch.responses['403']").exists())
				.andExpect(jsonPath("$.paths['/api/v1/reports/{reportId}/attachments/{attachmentId}'].get.responses['206']").exists())
				.andExpect(jsonPath("$.paths['/api/v1/reports'].get.parameters[?(@.name == 'status')].schema.enum[0]").value("new"));
	}

}
