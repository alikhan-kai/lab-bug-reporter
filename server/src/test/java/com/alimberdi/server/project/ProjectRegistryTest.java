package com.alimberdi.server.project;

import org.junit.jupiter.api.Test;
import org.springframework.core.io.DefaultResourceLoader;

import static org.assertj.core.api.Assertions.assertThat;

class ProjectRegistryTest {

	private final ProjectRegistry projectRegistry =
			new ProjectRegistry(new DefaultResourceLoader(), "classpath:projects-dev.yaml");

	@Test
	void findsProjectAndItsOriginsByKey() {
		Project project = projectRegistry.findByKey("pk_sdu_portal_2026").orElseThrow();

		assertThat(project.slug()).isEqualTo("demo");
		assertThat(project.isOriginAllowed("http://localhost:3000")).isTrue();
		assertThat(project.isOriginAllowed("https://evil.example")).isFalse();
		assertThat(project.isOriginAllowed(null)).isFalse();
	}

	@Test
	void returnsEmptyForUnknownKey() {
		assertThat(projectRegistry.findByKey("missing")).isEmpty();
	}

}
