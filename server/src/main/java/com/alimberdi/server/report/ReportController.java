package com.alimberdi.server.report;

import com.alimberdi.server.security.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Reports for the dashboard. Which roles may call what is set in {@code SecurityConfig}. */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/reports")
public class ReportController {

	private static final int MAX_PAGE_SIZE = 100;

	// The files come from website users. The sandbox keeps an uploaded SVG from running scripts on the dashboard origin.
	private static final String ATTACHMENT_CONTENT_SECURITY_POLICY = "sandbox";

	private final ReportService reportService;

	@GetMapping
	public PageResponse<ReportSummaryResponse> getReports(
			@AuthenticationPrincipal CurrentUser user,
			@RequestParam(required = false) String project,
			@RequestParam(required = false) ReportStatus status,
			@RequestParam(required = false) ReportType type,
			@RequestParam(required = false) String q,
			@RequestParam(defaultValue = "0") @Min(0) int page,
			@RequestParam(defaultValue = "20") @Min(1) @Max(MAX_PAGE_SIZE) int size
	) {
		return reportService.findReports(user, new ReportFilter(project, status, type, q), page, size);
	}

	@GetMapping("/{reportId}")
	public ReportDetailResponse getReport(@AuthenticationPrincipal CurrentUser user, @PathVariable UUID reportId) {
		return reportService.findReport(user, reportId);
	}

	@GetMapping("/{reportId}/context")
	public ResponseEntity<byte[]> getContext(@AuthenticationPrincipal CurrentUser user, @PathVariable UUID reportId) {
		return ResponseEntity.ok()
				.contentType(MediaType.APPLICATION_JSON)
				.body(reportService.readContext(user, reportId));
	}

	/** Sends a screenshot or video. Range requests let the video player seek. */
	@GetMapping("/{reportId}/attachments/{attachmentId}")
	public ResponseEntity<Resource> getAttachment(
			@AuthenticationPrincipal CurrentUser user,
			@PathVariable UUID reportId,
			@PathVariable UUID attachmentId,
			@RequestHeader(value = HttpHeaders.RANGE, required = false) String rangeHeader
	) {
		AttachmentContent attachment = reportService.openAttachment(user, reportId, attachmentId, rangeHeader);
		ByteRange range = attachment.range();

		ResponseEntity.BodyBuilder response = ResponseEntity.status(range.isPartial() ? HttpStatus.PARTIAL_CONTENT : HttpStatus.OK)
				.contentType(MediaType.parseMediaType(attachment.contentType()))
				.contentLength(range.length())
				.header(HttpHeaders.ACCEPT_RANGES, "bytes")
				.header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline().build().toString())
				.header("Content-Security-Policy", ATTACHMENT_CONTENT_SECURITY_POLICY);
		if (range.isPartial()) {
			response.header(HttpHeaders.CONTENT_RANGE, "bytes " + range.start() + "-" + range.end() + "/" + range.fileSizeBytes());
		}
		return response.body(new InputStreamResource(attachment.content()));
	}

	@PatchMapping("/{reportId}")
	public ReportDetailResponse updateReport(
			@AuthenticationPrincipal CurrentUser user,
			@PathVariable UUID reportId,
			@Valid @RequestBody UpdateReportRequest request
	) {
		return reportService.updateStatus(user, reportId, request.status());
	}

	@DeleteMapping("/{reportId}")
	public ResponseEntity<Void> deleteReport(@AuthenticationPrincipal CurrentUser user, @PathVariable UUID reportId) {
		reportService.deleteReport(user, reportId);
		return ResponseEntity.noContent().build();
	}

}
