package com.alimberdi.server.ingest;

import com.alimberdi.server.exception.InvalidReportException;
import com.alimberdi.server.exception.OriginNotAllowedException;
import com.alimberdi.server.exception.ResourceNotFoundException;
import com.alimberdi.server.exception.StorageException;
import com.alimberdi.server.project.Project;
import com.alimberdi.server.project.ProjectRegistry;
import com.alimberdi.server.report.Attachment;
import com.alimberdi.server.report.AttachmentKind;
import com.alimberdi.server.report.Report;
import com.alimberdi.server.report.ReportPayload;
import com.alimberdi.server.report.ReportRepository;
import com.alimberdi.server.storage.ObjectStorage;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.zip.GZIPOutputStream;

@Service
@RequiredArgsConstructor
public class IngestService {

	private static final String CONTEXT_OBJECT_NAME = "context.json.gz";
	private static final String GZIP_CONTENT_TYPE = "application/gzip";

	private final ProjectRegistry projectRegistry;
	private final IngestLimitsValidator limitsValidator;
	private final ObjectStorage objectStorage;
	private final ReportRepository reportRepository;
	private final ObjectMapper objectMapper;

	/** Stores the files and the context in the bucket, then saves the report. */
	public IngestResponse ingest(
			String projectKey,
			String origin,
			ReportPayload report,
			MultipartFile context,
			List<MultipartFile> screenshots,
			MultipartFile video
	) {
		Project project = findProject(projectKey);
		if (!project.isOriginAllowed(origin)) {
			throw new OriginNotAllowedException("Origin is not allowed for this project");
		}

		List<MultipartFile> screenshotFiles = screenshots != null ? screenshots : List.of();
		limitsValidator.checkScreenshots(screenshotFiles);
		if (video != null) {
			limitsValidator.checkVideo(video, report.videoDurationMs());
		}
		byte[] compressedContext = compressContext(context);
		limitsValidator.checkCompressedContext(compressedContext.length);

		UUID reportId = UUID.randomUUID();
		String objectPrefix = project.slug() + "/" + reportId + "/";
		List<String> storedObjectKeys = new ArrayList<>();
		try {
			String contextObjectKey = objectPrefix + CONTEXT_OBJECT_NAME;
			storeObject(storedObjectKeys, contextObjectKey, new ByteArrayInputStream(compressedContext), compressedContext.length, GZIP_CONTENT_TYPE);

			Report reportEntity = buildReport(reportId, project, report, contextObjectKey);
			for (MultipartFile screenshot : screenshotFiles) {
				reportEntity.addAttachment(storeAttachment(storedObjectKeys, objectPrefix, screenshot, AttachmentKind.SCREENSHOT, report));
			}
			if (video != null) {
				reportEntity.addAttachment(storeAttachment(storedObjectKeys, objectPrefix, video, AttachmentKind.VIDEO, report));
			}

			reportRepository.save(reportEntity);
		} catch (RuntimeException exception) {
			objectStorage.deleteAll(storedObjectKeys);
			throw exception;
		}
		return new IngestResponse(reportId);
	}

	private Project findProject(String projectKey) {
		return projectRegistry.findByKey(projectKey)
				.orElseThrow(() -> new ResourceNotFoundException("Unknown project key"));
	}

	private byte[] compressContext(MultipartFile context) {
		try {
			byte[] json = context.getBytes();
			validateContextJson(json);
			ByteArrayOutputStream compressed = new ByteArrayOutputStream();
			try (GZIPOutputStream gzip = new GZIPOutputStream(compressed)) {
				gzip.write(json);
			}
			return compressed.toByteArray();
		} catch (IOException exception) {
			throw new UncheckedIOException("Cannot read the context part", exception);
		}
	}

	private void validateContextJson(byte[] json) {
		try {
			if (!objectMapper.readTree(json).isObject()) {
				throw new InvalidReportException("Context must be a JSON object");
			}
		} catch (JacksonException exception) {
			throw new InvalidReportException("Context must be valid JSON");
		}
	}

	private Report buildReport(UUID reportId, Project project, ReportPayload report, String contextObjectKey) {
		return Report.builder()
				.id(reportId)
				.projectSlug(project.slug())
				.type(report.type())
				.title(report.title())
				.description(report.description())
				.pageUrl(report.pageUrl())
				.reporterId(report.reporter().id())
				.reporterEmail(report.reporter().email())
				.environment(report.environment())
				.hostMetadata(report.hostMetadata())
				.contextObjectKey(contextObjectKey)
				.build();
	}

	private Attachment storeAttachment(
			List<String> storedObjectKeys,
			String objectPrefix,
			MultipartFile file,
			AttachmentKind kind,
			ReportPayload report
	) {
		UUID attachmentId = UUID.randomUUID();
		String objectKey = objectPrefix + attachmentId;
		try (InputStream content = file.getInputStream()) {
			storeObject(storedObjectKeys, objectKey, content, file.getSize(), file.getContentType());
		} catch (IOException exception) {
			throw new StorageException("Cannot read uploaded file " + file.getName(), exception);
		}

		boolean isVideo = kind == AttachmentKind.VIDEO;
		return Attachment.builder()
				.id(attachmentId)
				.kind(kind)
				.contentType(file.getContentType())
				.sizeBytes(file.getSize())
				.durationMs(isVideo ? report.videoDurationMs() : null)
				.recordingStartTime(isVideo ? report.recordingStartTime() : null)
				.objectKey(objectKey)
				.build();
	}

	private void storeObject(List<String> storedObjectKeys, String objectKey, InputStream content, long sizeBytes, String contentType) {
		storedObjectKeys.add(objectKey);
		objectStorage.put(objectKey, content, sizeBytes, contentType);
	}

}
