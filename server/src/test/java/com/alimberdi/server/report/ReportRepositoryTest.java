package com.alimberdi.server.report;

import com.alimberdi.server.config.JpaAuditingConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(JpaAuditingConfig.class)
class ReportRepositoryTest {

	@Autowired
	private ReportRepository reportRepository;

	@Test
	void fillsCreatedAtAndSavesAttachmentsWithTheReport() {
		Report report = Report.builder()
				.id(UUID.randomUUID())
				.projectSlug("demo")
				.type(ReportType.BUG)
				.title("Broken")
				.pageUrl("http://localhost:3000/")
				.contextObjectKey("demo/report/context.json.gz")
				.build();
		report.addAttachment(Attachment.builder()
				.id(UUID.randomUUID())
				.kind(AttachmentKind.SCREENSHOT)
				.contentType("image/png")
				.sizeBytes(16)
				.objectKey("demo/report/attachment")
				.build());

		assertThat(report.isNew()).isTrue();
		Report saved = reportRepository.saveAndFlush(report);

		assertThat(saved).isSameAs(report);
		assertThat(saved.getCreatedAt()).isNotNull();
		assertThat(saved.isNew()).isFalse();
		assertThat(saved.getAttachments()).hasSize(1);
	}

}
