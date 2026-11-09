package com.alimberdi.server.storage;

import com.alimberdi.server.exception.StorageException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.NoSuchBucketException;

import java.io.InputStream;
import java.util.List;

/** Reads and writes report files in the S3 bucket. */
@Slf4j
@Component
@RequiredArgsConstructor
public class ObjectStorage {

	private final S3Client s3Client;
	private final S3Properties properties;

	@EventListener(ApplicationReadyEvent.class)
	public void createBucketIfMissing() {
		try {
			s3Client.headBucket(request -> request.bucket(properties.bucket()));
		} catch (NoSuchBucketException exception) {
			s3Client.createBucket(request -> request.bucket(properties.bucket()));
			log.info("Created bucket {}", properties.bucket());
		}
	}

	public void put(String objectKey, InputStream content, long sizeBytes, String contentType) {
		try {
			s3Client.putObject(
					request -> request.bucket(properties.bucket()).key(objectKey).contentType(contentType),
					RequestBody.fromInputStream(content, sizeBytes)
			);
		} catch (SdkException exception) {
			throw new StorageException("Cannot store object " + objectKey, exception);
		}
	}

	/** Removes objects left by a failed submit. A failed removal is logged, as the submit has already failed. */
	public void deleteAll(List<String> objectKeys) {
		for (String objectKey : objectKeys) {
			try {
				s3Client.deleteObject(request -> request.bucket(properties.bucket()).key(objectKey));
			} catch (SdkException exception) {
				log.warn("Cannot delete object {}", objectKey, exception);
			}
		}
	}

}
