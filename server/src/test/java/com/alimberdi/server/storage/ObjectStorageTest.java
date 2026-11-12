package com.alimberdi.server.storage;

import com.alimberdi.server.TestcontainersConfiguration;
import com.alimberdi.server.exception.ResourceNotFoundException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class ObjectStorageTest {

	private static final byte[] CONTENT = "0123456789".getBytes(StandardCharsets.UTF_8);

	private final String objectKey = "test/" + UUID.randomUUID() + "/file.txt";

	@Autowired
	private ObjectStorage objectStorage;

	@Test
	void readsBackWhatItStored() {
		put(objectKey);

		assertThat(objectStorage.read(objectKey)).isEqualTo(CONTENT);
	}

	@Test
	void opensOnlyTheRequestedBytes() throws IOException {
		put(objectKey);

		try (InputStream range = objectStorage.open(objectKey, 2, 4)) {
			assertThat(range.readAllBytes()).asString(StandardCharsets.UTF_8).isEqualTo("234");
		}
	}

	@Test
	void reportsAMissingObjectAsNotFound() {
		assertThatThrownBy(() -> objectStorage.read(objectKey)).isInstanceOf(ResourceNotFoundException.class);
		assertThatThrownBy(() -> objectStorage.open(objectKey)).isInstanceOf(ResourceNotFoundException.class);
	}

	@Test
	void deletesObjects() {
		put(objectKey);

		objectStorage.deleteAll(List.of(objectKey));

		assertThatThrownBy(() -> objectStorage.read(objectKey)).isInstanceOf(ResourceNotFoundException.class);
	}

	private void put(String key) {
		objectStorage.put(key, new ByteArrayInputStream(CONTENT), CONTENT.length, "text/plain");
	}

}
