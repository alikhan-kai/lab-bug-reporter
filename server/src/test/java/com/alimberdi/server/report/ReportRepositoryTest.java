package com.alimberdi.server.report;

import com.alimberdi.server.TestcontainersConfiguration;
import com.alimberdi.server.config.JpaAuditingConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({JpaAuditingConfig.class, TestcontainersConfiguration.class})
class ReportRepositoryTest {

	private static final PageRequest NEWEST_FIRST = PageRequest.of(0, 10, Sort.by(Sort.Order.desc("createdAt")));

	// Each test rolls back, but the database is shared by every test class, so the reports get a project of their own.
	private final String project = "test-" + UUID.randomUUID();

	@Autowired
	private ReportRepository reportRepository;

	@Test
	void fillsAuditTimesAndSavesAttachmentsWithTheReport() {
		Report report = report(project, "Broken", null);
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
		assertThat(saved.getUpdatedAt()).isNotNull();
		assertThat(saved.isNew()).isFalse();
		assertThat(saved.getAttachments()).hasSize(1);
	}

	@Test
	void filtersByProjectStatusAndType() {
		Report expected = reportRepository.save(report(project, "Upload fails", null));
		reportRepository.save(report("other-" + project, "Upload fails elsewhere", null));
		Report resolved = report(project, "Upload fixed", null);
		resolved.changeStatus(ReportStatus.RESOLVED);
		reportRepository.save(resolved);
		reportRepository.flush();

		ReportFilter filter = new ReportFilter(null, Set.of(ReportStatus.NEW), Set.of(ReportType.BUG), null);
		Page<Report> page = reportRepository.findAll(ReportSpecifications.matching(filter, List.of(project)), NEWEST_FIRST);

		assertThat(page.getContent()).extracting(Report::getId).containsExactly(expected.getId());
	}

	@Test
	void keepsReportsOfAnySelectedStatus() {
		Report open = reportRepository.save(report(project, "Still broken", null));
		Report inProgress = report(project, "Being fixed", null);
		inProgress.changeStatus(ReportStatus.IN_PROGRESS);
		reportRepository.save(inProgress);
		Report resolved = report(project, "Fixed", null);
		resolved.changeStatus(ReportStatus.RESOLVED);
		reportRepository.save(resolved);
		reportRepository.flush();

		ReportFilter filter = new ReportFilter(null, Set.of(ReportStatus.NEW, ReportStatus.IN_PROGRESS), null, null);
		Page<Report> page = reportRepository.findAll(ReportSpecifications.matching(filter, List.of(project)), NEWEST_FIRST);

		assertThat(page.getContent()).extracting(Report::getId).containsExactlyInAnyOrder(open.getId(), inProgress.getId());
	}

	@Test
	void searchesTitleAndDescriptionIgnoringCase() {
		Report byTitle = reportRepository.save(report(project, "Upload FAILS", null));
		Report byDescription = reportRepository.save(report(project, "Broken page", "the upload fails after a second"));
		reportRepository.save(report(project, "Typo on the main page", null));
		reportRepository.flush();

		ReportFilter filter = new ReportFilter(null, null, null, "  upload fails ");
		Page<Report> page = reportRepository.findAll(ReportSpecifications.matching(filter, List.of(project)), NEWEST_FIRST);

		assertThat(page.getContent()).extracting(Report::getId)
				.containsExactlyInAnyOrder(byTitle.getId(), byDescription.getId());
	}

	@Test
	void treatsLikeWildcardsInSearchAsText() {
		Report withPercent = reportRepository.save(report(project, "CPU at 100% on upload", null));
		reportRepository.save(report(project, "CPU at 1000 on upload", null));
		reportRepository.flush();

		ReportFilter filter = new ReportFilter(null, null, null, "100%");
		Page<Report> page = reportRepository.findAll(ReportSpecifications.matching(filter, List.of(project)), NEWEST_FIRST);

		assertThat(page.getContent()).extracting(Report::getId).containsExactly(withPercent.getId());
	}

	private Report report(String projectSlug, String title, String description) {
		return Report.builder()
				.id(UUID.randomUUID())
				.projectSlug(projectSlug)
				.type(ReportType.BUG)
				.title(title)
				.description(description)
				.pageUrl("http://localhost:3000/")
				.contextObjectKey(projectSlug + "/report/context.json.gz")
				.build();
	}

}
