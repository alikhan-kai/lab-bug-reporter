package com.alimberdi.server.report;

import com.alimberdi.server.exception.RangeNotSatisfiableException;
import com.alimberdi.server.exception.ResourceNotFoundException;
import com.alimberdi.server.project.ProjectRegistry;
import com.alimberdi.server.security.SecurityConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.io.ByteArrayInputStream;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ReportController.class)
@Import(SecurityConfig.class)
class ReportControllerTest {

	private static final String URL = "/api/v1/reports";
	private static final UUID REPORT_ID = UUID.fromString("5b0c3a52-6f49-4c55-9d3f-2a3f4a1b7c10");
	private static final UUID ATTACHMENT_ID = UUID.fromString("0d8e7b9c-1a2b-4c3d-8e9f-0a1b2c3d4e5f");

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private JwtDecoder jwtDecoder;

	@MockitoBean
	private ReportService reportService;

	// Needed by IngestCorsFilter, which the web slice picks up with every controller.
	@MockitoBean
	private ProjectRegistry projectRegistry;

	@Test
	void takesSeveralValuesOfAFilter() throws Exception {
		givenToken("viewer-token", "viewer");
		ReportFilter filter = new ReportFilter(null, Set.of(ReportStatus.NEW, ReportStatus.IN_PROGRESS), Set.of(ReportType.BUG, ReportType.QUESTION), null);
		when(reportService.findReports(any(), eq(filter), eq(0), eq(20)))
				.thenReturn(new PageResponse<>(List.of(summary()), 0, 20, 1, 1));

		mockMvc.perform(get(URL)
						.param("status", "new", "in_progress")
						.param("type", "bug", "question")
						.header(HttpHeaders.AUTHORIZATION, "Bearer viewer-token"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.totalElements").value(1));
	}

	@Test
	void listsReportsWithLowercaseFilterValues() throws Exception {
		givenToken("viewer-token", "viewer");
		ReportFilter filter = new ReportFilter(Set.of("demo"), Set.of(ReportStatus.IN_PROGRESS), Set.of(ReportType.BUG), "upload");
		when(reportService.findReports(any(), eq(filter), eq(1), eq(10)))
				.thenReturn(new PageResponse<>(List.of(summary()), 1, 10, 11, 2));

		mockMvc.perform(get(URL)
						.param("project", "demo")
						.param("status", "in_progress")
						.param("type", "bug")
						.param("q", "upload")
						.param("page", "1")
						.param("size", "10")
						.header(HttpHeaders.AUTHORIZATION, "Bearer viewer-token"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.content[0].id").value(REPORT_ID.toString()))
				.andExpect(jsonPath("$.content[0].status").value("in_progress"))
				.andExpect(jsonPath("$.content[0].type").value("bug"))
				.andExpect(jsonPath("$.content[0].createdAt").value("2026-11-10T09:00:00Z"))
				.andExpect(jsonPath("$.content[0].failedRequestCount").value(1))
				.andExpect(jsonPath("$.totalElements").value(11))
				.andExpect(jsonPath("$.totalPages").value(2));
	}

	@Test
	void rejectsUnknownStatusFilter() throws Exception {
		givenToken("viewer-token", "viewer");

		mockMvc.perform(get(URL).param("status", "closed").header(HttpHeaders.AUTHORIZATION, "Bearer viewer-token"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.status").value(400))
				.andExpect(jsonPath("$.message").value("Invalid value for status"));
	}

	@Test
	void rejectsTooLargePage() throws Exception {
		givenToken("viewer-token", "viewer");

		mockMvc.perform(get(URL).param("size", "500").header(HttpHeaders.AUTHORIZATION, "Bearer viewer-token"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("size: must be less than or equal to 100"));
		verifyNoInteractions(reportService);
	}

	@Test
	void requiresTokenForReports() throws Exception {
		mockMvc.perform(get(URL))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.status").value(401));
	}

	@Test
	void answersHiddenReportAsJsonNotFound() throws Exception {
		givenToken("viewer-token", "viewer");
		when(reportService.findReport(any(), eq(REPORT_ID))).thenThrow(new ResourceNotFoundException("Report not found"));

		mockMvc.perform(get(URL + "/" + REPORT_ID).header(HttpHeaders.AUTHORIZATION, "Bearer viewer-token"))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.status").value(404))
				.andExpect(jsonPath("$.message").value("Report not found"));
	}

	@Test
	void sendsContextAsJson() throws Exception {
		givenToken("viewer-token", "viewer");
		when(reportService.readContext(any(), eq(REPORT_ID))).thenReturn("{\"console\":[]}".getBytes());

		mockMvc.perform(get(URL + "/" + REPORT_ID + "/context").header(HttpHeaders.AUTHORIZATION, "Bearer viewer-token"))
				.andExpect(status().isOk())
				.andExpect(content().contentType(MediaType.APPLICATION_JSON))
				.andExpect(content().json("{\"console\":[]}"));
	}

	@Test
	void sendsWholeAttachmentInSandbox() throws Exception {
		givenToken("viewer-token", "viewer");
		when(reportService.openAttachment(any(), eq(REPORT_ID), eq(ATTACHMENT_ID), isNull()))
				.thenReturn(new AttachmentContent("image/png", new ByteRange(0, 3, 4, false), new ByteArrayInputStream(new byte[] {1, 2, 3, 4})));

		mockMvc.perform(get(attachmentUrl()).header(HttpHeaders.AUTHORIZATION, "Bearer viewer-token"))
				.andExpect(status().isOk())
				.andExpect(content().contentType("image/png"))
				.andExpect(content().bytes(new byte[] {1, 2, 3, 4}))
				.andExpect(header().string(HttpHeaders.CONTENT_LENGTH, "4"))
				.andExpect(header().string(HttpHeaders.ACCEPT_RANGES, "bytes"))
				.andExpect(header().string("Content-Security-Policy", "sandbox"))
				.andExpect(header().doesNotExist(HttpHeaders.CONTENT_RANGE));
	}

	@Test
	void sendsRequestedRangeAsPartialContent() throws Exception {
		givenToken("viewer-token", "viewer");
		when(reportService.openAttachment(any(), eq(REPORT_ID), eq(ATTACHMENT_ID), eq("bytes=2-3")))
				.thenReturn(new AttachmentContent("video/webm", new ByteRange(2, 3, 4, true), new ByteArrayInputStream(new byte[] {3, 4})));

		mockMvc.perform(get(attachmentUrl())
						.header(HttpHeaders.AUTHORIZATION, "Bearer viewer-token")
						.header(HttpHeaders.RANGE, "bytes=2-3"))
				.andExpect(status().isPartialContent())
				.andExpect(content().bytes(new byte[] {3, 4}))
				.andExpect(header().string(HttpHeaders.CONTENT_RANGE, "bytes 2-3/4"))
				.andExpect(header().string(HttpHeaders.CONTENT_LENGTH, "2"));
	}

	@Test
	void answersUnsatisfiableRangeWithFileSize() throws Exception {
		givenToken("viewer-token", "viewer");
		when(reportService.openAttachment(any(), eq(REPORT_ID), eq(ATTACHMENT_ID), eq("bytes=10-")))
				.thenThrow(new RangeNotSatisfiableException(4));

		mockMvc.perform(get(attachmentUrl())
						.header(HttpHeaders.AUTHORIZATION, "Bearer viewer-token")
						.header(HttpHeaders.RANGE, "bytes=10-"))
				.andExpect(status().isRequestedRangeNotSatisfiable())
				.andExpect(header().string(HttpHeaders.CONTENT_RANGE, "bytes */4"))
				.andExpect(jsonPath("$.status").value(416));
	}

	@Test
	void letsTriagerChangeStatus() throws Exception {
		givenToken("triager-token", "triager");
		when(reportService.updateStatus(any(), eq(REPORT_ID), eq(ReportStatus.RESOLVED))).thenReturn(detail(ReportStatus.RESOLVED));

		mockMvc.perform(patch(URL + "/" + REPORT_ID)
						.header(HttpHeaders.AUTHORIZATION, "Bearer triager-token")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"status\":\"resolved\"}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("resolved"));
	}

	@Test
	void rejectsStatusChangeWithoutStatus() throws Exception {
		givenToken("triager-token", "triager");

		mockMvc.perform(patch(URL + "/" + REPORT_ID)
						.header(HttpHeaders.AUTHORIZATION, "Bearer triager-token")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("status: must not be null"));
	}

	@Test
	void forbidsViewerToChangeStatus() throws Exception {
		givenToken("viewer-token", "viewer");

		mockMvc.perform(patch(URL + "/" + REPORT_ID)
						.header(HttpHeaders.AUTHORIZATION, "Bearer viewer-token")
						.contentType(MediaType.APPLICATION_JSON)
						.content("{\"status\":\"resolved\"}"))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.status").value(403));
		verifyNoInteractions(reportService);
	}

	@Test
	void forbidsTriagerToDeleteReport() throws Exception {
		givenToken("triager-token", "triager");

		mockMvc.perform(delete(URL + "/" + REPORT_ID).header(HttpHeaders.AUTHORIZATION, "Bearer triager-token"))
				.andExpect(status().isForbidden());
		verifyNoInteractions(reportService);
	}

	@Test
	void letsAdminDeleteReport() throws Exception {
		givenToken("admin-token", "admin");

		mockMvc.perform(delete(URL + "/" + REPORT_ID).header(HttpHeaders.AUTHORIZATION, "Bearer admin-token"))
				.andExpect(status().isNoContent());
		verify(reportService).deleteReport(any(), eq(REPORT_ID));
	}

	private String attachmentUrl() {
		return URL + "/" + REPORT_ID + "/attachments/" + ATTACHMENT_ID;
	}

	private ReportSummaryResponse summary() {
		return new ReportSummaryResponse(
				REPORT_ID, "demo", "Demo website", ReportType.BUG, "Upload button does nothing", ReportStatus.IN_PROGRESS,
				"http://localhost:5500/demo/", new ReporterResponse("u-1842", null), true, 1, 2, 1,
				Instant.parse("2026-11-10T09:00:00Z")
		);
	}

	private ReportDetailResponse detail(ReportStatus status) {
		Instant createdAt = Instant.parse("2026-11-10T09:00:00Z");
		return new ReportDetailResponse(
				REPORT_ID, "demo", "Demo website", ReportType.BUG, "Upload button does nothing", null, status,
				"http://localhost:5500/demo/", new ReporterResponse("u-1842", null), Map.of(), Map.of(), List.of(),
				null, 0, 0, createdAt, createdAt
		);
	}

	private void givenToken(String tokenValue, String... realmRoles) {
		Jwt token = Jwt.withTokenValue(tokenValue)
				.header("alg", "RS256")
				.subject("user-1")
				.claim("preferred_username", "dev-user")
				.claim("realm_access", Map.of("roles", List.of(realmRoles)))
				.build();
		when(jwtDecoder.decode(tokenValue)).thenReturn(token);
	}

}
