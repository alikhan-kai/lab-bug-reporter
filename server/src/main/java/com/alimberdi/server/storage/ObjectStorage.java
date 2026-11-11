package com.alimberdi.server.storage;

import com.alimberdi.server.exception.ResourceNotFoundException;
import com.alimberdi.server.exception.StorageException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchBucketException;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;

import java.io.InputStream;
import java.util.List;
import java.util.function.Consumer;

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

	public byte[] read(String objectKey) {
		try {
			return s3Client.getObjectAsBytes(request -> request.bucket(properties.bucket()).key(objectKey)).asByteArray();
		} catch (NoSuchKeyException exception) {
			throw new ResourceNotFoundException("File not found");
		} catch (SdkException exception) {
			throw new StorageException("Cannot read object " + objectKey, exception);
		}
	}

	/** Opens the whole object. The caller closes the stream. */
	public InputStream open(String objectKey) {
		return open(objectKey, request -> request.bucket(properties.bucket()).key(objectKey));
	}

	/** Opens the bytes from {@code start} to {@code end}, both inclusive. The caller closes the stream. */
	public InputStream open(String objectKey, long start, long end) {
		return open(objectKey, request -> request
				.bucket(properties.bucket())
				.key(objectKey)
				.range("bytes=" + start + "-" + end));
	}

	private InputStream open(String objectKey, Consumer<GetObjectRequest.Builder> request) {
		try {
			return s3Client.getObject(request);
		} catch (NoSuchKeyException exception) {
			throw new ResourceNotFoundException("File not found");
		} catch (SdkException exception) {
			throw new StorageException("Cannot read object " + objectKey, exception);
		}
	}

	/**
	 * Removes the objects of a failed submit or a deleted report. A failed removal is only logged: the caller
	 * has already failed or deleted the report, and a left-over object is unreachable without it.
	 */
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
