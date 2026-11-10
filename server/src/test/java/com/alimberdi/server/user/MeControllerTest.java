package com.alimberdi.server.user;

import com.alimberdi.server.project.Project;
import com.alimberdi.server.project.ProjectAccessService;
import com.alimberdi.server.project.ProjectRegistry;
import com.alimberdi.server.security.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.contains;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(MeController.class)
@Import(SecurityConfig.class)
class MeControllerTest {

	private static final String URL = "/api/v1/me";

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private JwtDecoder jwtDecoder;

	@MockitoBean
	private ProjectAccessService projectAccessService;

	// Needed by IngestCorsFilter, which the web slice picks up with every controller.
	@MockitoBean
	private ProjectRegistry projectRegistry;

	@Test
	void returnsUserRolesAndVisibleProjects() throws Exception {
		givenToken("triager-token", "triager", "team-demo");
		when(projectAccessService.findVisible(any()))
				.thenReturn(List.of(new Project("demo", "Demo website", "pk_demo", List.of(), List.of("team-demo"))));

		mockMvc.perform(get(URL).header(HttpHeaders.AUTHORIZATION, "Bearer triager-token"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value("user-1"))
				.andExpect(jsonPath("$.username").value("dev-user"))
				.andExpect(jsonPath("$.email").value("dev@lab.example"))
				.andExpect(jsonPath("$.roles").value(contains("triager")))
				.andExpect(jsonPath("$.projects[0].slug").value("demo"))
				.andExpect(jsonPath("$.projects[0].name").value("Demo website"))
				.andExpect(jsonPath("$.projects[0].key").doesNotExist());
	}

	@Test
	void rejectsRequestWithoutTokenAsJsonUnauthorized() throws Exception {
		mockMvc.perform(get(URL))
				.andExpect(status().isUnauthorized())
				.andExpect(header().string(HttpHeaders.WWW_AUTHENTICATE, "Bearer"))
				.andExpect(jsonPath("$.status").value(401))
				.andExpect(jsonPath("$.error").value("Unauthorized"))
				.andExpect(jsonPath("$.message").value("Missing or invalid access token"));
	}

	@Test
	void rejectsInvalidTokenAsJsonUnauthorized() throws Exception {
		when(jwtDecoder.decode("expired-token")).thenThrow(new BadJwtException("Jwt expired"));

		mockMvc.perform(get(URL).header(HttpHeaders.AUTHORIZATION, "Bearer expired-token"))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.status").value(401));
	}

	@Test
	void forbidsTokenWithoutDashboardRole() throws Exception {
		givenToken("plain-token", "offline_access");

		mockMvc.perform(get(URL).header(HttpHeaders.AUTHORIZATION, "Bearer plain-token"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.status").value(403))
				.andExpect(jsonPath("$.message").value("Your role does not allow this action"));
	}

	@Test
	void forbidsViewerToChangeReportStatus() throws Exception {
		givenToken("viewer-token", "viewer", "team-demo");

		mockMvc.perform(patch("/api/v1/reports/some-id").header(HttpHeaders.AUTHORIZATION, "Bearer viewer-token"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.status").value(403));
	}

	@Test
	void forbidsTriagerToDeleteReport() throws Exception {
		givenToken("triager-token", "triager", "team-demo");

		mockMvc.perform(delete("/api/v1/reports/some-id").header(HttpHeaders.AUTHORIZATION, "Bearer triager-token"))
				.andExpect(status().isForbidden());
	}

	private void givenToken(String tokenValue, String... realmRoles) {
		Jwt token = Jwt.withTokenValue(tokenValue)
				.header("alg", "RS256")
				.subject("user-1")
				.claim("preferred_username", "dev-user")
				.claim("email", "dev@lab.example")
				.claim("realm_access", Map.of("roles", List.of(realmRoles)))
				.build();
		when(jwtDecoder.decode(tokenValue)).thenReturn(token);
	}

}
