package com.alimberdi.server.report;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.domain.Persistable;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "reports")
@EntityListeners(AuditingEntityListener.class)
@Getter
@Builder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class Report implements Persistable<UUID> {

	// Assigned before saving, because the S3 object keys contain it.
	@Id
	private UUID id;

	@Column(nullable = false)
	private String projectSlug;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private ReportType type;

	@Column(nullable = false)
	private String title;

	private String description;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	@Builder.Default
	private ReportStatus status = ReportStatus.NEW;

	@Column(nullable = false)
	private String pageUrl;

	private String reporterId;

	private String reporterEmail;

	@JdbcTypeCode(SqlTypes.JSON)
	private Map<String, Object> environment;

	@JdbcTypeCode(SqlTypes.JSON)
	private Map<String, Object> hostMetadata;

	@Column(nullable = false)
	private String contextObjectKey;

	@CreatedDate
	@Column(nullable = false, updatable = false)
	private Instant createdAt;

	@OneToMany(mappedBy = "report", cascade = CascadeType.ALL, orphanRemoval = true)
	@Builder.Default
	private List<Attachment> attachments = new ArrayList<>();

	public void addAttachment(Attachment attachment) {
		attachment.attachTo(this);
		attachments.add(attachment);
	}

	@Override
	public boolean isNew() {
		return createdAt == null;
	}

}
