package com.alimberdi.server.ingest;

import com.alimberdi.server.exception.OriginNotAllowedException;
import com.alimberdi.server.project.Project;
import com.alimberdi.server.project.ProjectRegistry;
import com.alimberdi.server.security.SecurityConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(IngestController.class)
@Import(SecurityConfig.class)
class IngestControllerTest {

	private static final String URL = "/api/v1/ingest/pk_demo/reports";
	private static final String ORIGIN = "http://localhost:3000";
	private static final String VALID_REPORT = """
			{"type":"bug","title":"Broken","pageUrl":"http://localhost:3000/","reporter":{"id":"u-1"}}
			""";

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private IngestService ingestService;

	@MockitoBean
	private ProjectRegistry projectRegistry;

	@MockitoBean
	private JwtDecoder jwtDecoder;

	@BeforeEach
	void setUpProject() {
		Project project = new Project("demo", "Demo", "pk_demo", List.of(ORIGIN), List.of());
		when(projectRegistry.findByKey("pk_demo")).thenReturn(Optional.of(project));
	}

	@Test
	void returnsCreatedReportIdWithCorsHeaderForAllowedOrigin() throws Exception {
		UUID reportId = UUID.randomUUID();
		when(ingestService.ingest(eq("pk_demo"), eq(ORIGIN), any(), any(), any(), any()))
				.thenReturn(new IngestResponse(reportId));

		mockMvc.perform(multipart(URL).file(report(VALID_REPORT)).file(context()).header(HttpHeaders.ORIGIN, ORIGIN))
				.andExpect(status().isCreated())
				.andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, ORIGIN))
				.andExpect(jsonPath("$.reportId").value(reportId.toString()));
	}

	@Test
	void rejectsReportWithoutIdentity() throws Exception {
		String report = """
				{"type":"bug","title":"Broken","pageUrl":"http://localhost:3000/"}
				""";

		mockMvc.perform(multipart(URL).file(report(report)).file(context()).header(HttpHeaders.ORIGIN, ORIGIN))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.status").value(400))
				.andExpect(jsonPath("$.message").value("reporter: must not be null"));
	}

	@Test
	void rejectsReporterWithoutIdOrEmail() throws Exception {
		String report = """
				{"type":"bug","title":"Broken","pageUrl":"http://localhost:3000/","reporter":{}}
				""";

		mockMvc.perform(multipart(URL).file(report(report)).file(context()).header(HttpHeaders.ORIGIN, ORIGIN))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("reporter.identified: reporter must have an id or an email"));
	}

	@Test
	void rejectsUnknownReportType() throws Exception {
		String report = """
				{"type":"nope","title":"Broken","pageUrl":"http://localhost:3000/","reporter":{"id":"u-1"}}
				""";

		mockMvc.perform(multipart(URL).file(report(report)).file(context()).header(HttpHeaders.ORIGIN, ORIGIN))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.status").value(400));
	}

	@Test
	void rejectsRequestWithoutContextPart() throws Exception {
		mockMvc.perform(multipart(URL).file(report(VALID_REPORT)).header(HttpHeaders.ORIGIN, ORIGIN))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.status").value(400))
				.andExpect(jsonPath("$.message").value("Required part 'context' is not present."));
	}

	@Test
	void returnsJsonForbiddenWithoutCorsHeaderForOtherOrigin() throws Exception {
		when(ingestService.ingest(any(), any(), any(), any(), any(), any()))
				.thenThrow(new OriginNotAllowedException("Origin is not allowed for this project"));

		mockMvc.perform(multipart(URL).file(report(VALID_REPORT)).file(context()).header(HttpHeaders.ORIGIN, "https://evil.example"))
				.andExpect(status().isForbidden())
				.andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN))
				.andExpect(jsonPath("$.status").value(403));
	}

	@Test
	void answersPreflightForAllowedOrigin() throws Exception {
		mockMvc.perform(options(URL)
						.header(HttpHeaders.ORIGIN, ORIGIN)
						.header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
				.andExpect(status().isNoContent())
				.andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, ORIGIN));
	}

	@Test
	void refusesPreflightForOtherOrigin() throws Exception {
		mockMvc.perform(options(URL)
						.header(HttpHeaders.ORIGIN, "https://evil.example")
						.header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
				.andExpect(status().isForbidden())
				.andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
	}

	private MockMultipartFile report(String json) {
		return new MockMultipartFile("report", "", MediaType.APPLICATION_JSON_VALUE, json.getBytes());
	}

	private MockMultipartFile context() {
		return new MockMultipartFile("context", "context.json", MediaType.APPLICATION_JSON_VALUE, "{}".getBytes());
	}

}
