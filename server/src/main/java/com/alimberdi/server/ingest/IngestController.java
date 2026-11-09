package com.alimberdi.server.ingest;

import com.alimberdi.server.report.ReportPayload;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/ingest")
public class IngestController {

	private final IngestService ingestService;

	@PostMapping(value = "/{projectKey}/reports", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public ResponseEntity<?> submit(
			@PathVariable String projectKey,
			@RequestHeader(value = HttpHeaders.ORIGIN, required = false) String origin,
			@Valid @RequestPart("report") ReportPayload report,
			@RequestPart("context") MultipartFile context,
			@RequestPart(value = "screenshots", required = false) List<MultipartFile> screenshots,
			@RequestPart(value = "video", required = false) MultipartFile video
	) {
		IngestResponse body	= ingestService.ingest(projectKey, origin, report, context, screenshots, video);
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(body);
	}

}
