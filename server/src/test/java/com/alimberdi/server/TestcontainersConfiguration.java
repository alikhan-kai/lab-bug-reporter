package com.alimberdi.server;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.test.context.DynamicPropertyRegistrar;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.lifecycle.Startables;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.MountableFile;

import java.time.Duration;

/**
 * Points the tests at a fresh Postgres and SeaweedFS in Docker, so they need only a running Docker and never
 * touch the local database or bucket. The images match docker-compose.yaml.
 * <p>
 * The containers start once and serve every test class, whichever Spring context it builds, and are removed
 * when the test run ends.
 */
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {

	private static final int S3_PORT = 8333;
	private static final String S3_ACCESS_KEY = "test-access-key";
	private static final String S3_SECRET_KEY = "test-secret-key";

	private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine");

	private static final GenericContainer<?> SEAWEEDFS = new GenericContainer<>("chrislusf/seaweedfs:4.03")
			// The HashiCorp Raft master bootstraps a one-node cluster at once: ready in about 2 s instead of 20 s.
			.withCommand("server", "-s3", "-s3.config=/etc/seaweedfs/s3.json", "-dir=/data",
					"-master.raftHashicorp", "-master.raftBootstrap")
			.withCopyFileToContainer(MountableFile.forClasspathResource("seaweedfs/s3.json"), "/etc/seaweedfs/s3.json")
			.withExposedPorts(S3_PORT)
			.waitingFor(Wait.forHttp("/healthz").forPort(S3_PORT).withStartupTimeout(Duration.ofMinutes(1)));

	static {
		Startables.deepStart(POSTGRES, SEAWEEDFS).join();
	}

	@Bean
	DynamicPropertyRegistrar containerProperties() {
		return registry -> {
			registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
			registry.add("spring.datasource.username", POSTGRES::getUsername);
			registry.add("spring.datasource.password", POSTGRES::getPassword);
			registry.add("app.s3.endpoint", () -> "http://" + SEAWEEDFS.getHost() + ":" + SEAWEEDFS.getMappedPort(S3_PORT));
			registry.add("app.s3.access-key", () -> S3_ACCESS_KEY);
			registry.add("app.s3.secret-key", () -> S3_SECRET_KEY);
		};
	}

}
