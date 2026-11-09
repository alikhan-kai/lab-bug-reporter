CREATE TABLE reports (
    id                 UUID PRIMARY KEY,
    project_slug       VARCHAR(255)  NOT NULL,
    type               VARCHAR(32)   NOT NULL,
    title              VARCHAR(300)  NOT NULL,
    description        TEXT,
    status             VARCHAR(32)   NOT NULL,
    page_url           VARCHAR(2048) NOT NULL,
    reporter_id        VARCHAR(255),
    reporter_email     VARCHAR(255),
    environment        JSONB,
    host_metadata      JSONB,
    context_object_key VARCHAR(512)  NOT NULL,
    created_at         TIMESTAMPTZ   NOT NULL
);

CREATE INDEX idx_reports_project_status_created_at ON reports (project_slug, status, created_at DESC);

CREATE TABLE attachments (
    id                   UUID PRIMARY KEY,
    report_id            UUID         NOT NULL REFERENCES reports (id) ON DELETE CASCADE,
    kind                 VARCHAR(32)  NOT NULL,
    content_type         VARCHAR(255) NOT NULL,
    size_bytes           BIGINT       NOT NULL,
    duration_ms          BIGINT,
    recording_start_time BIGINT,
    object_key           VARCHAR(512) NOT NULL
);

CREATE INDEX idx_attachments_report_id ON attachments (report_id);
