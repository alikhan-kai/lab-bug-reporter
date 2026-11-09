package com.alimberdi.server.ingest;

import com.alimberdi.server.report.ReportPayload;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
@RequiredArgsConstructor
public class IngestService {

	public IngestResponse ingest(
			String projectKey,
			String origin,
			ReportPayload report,
			MultipartFile context,
			List<MultipartFile> screenshots,
			MultipartFile video
	) {
		// TODO
		return null;
	}

}
