-- The dashboard list shows the counts as badges, so they are stored instead of read from S3 for every row.
ALTER TABLE reports ADD COLUMN console_error_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE reports ADD COLUMN failed_request_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE reports ADD COLUMN updated_at TIMESTAMPTZ;
UPDATE reports SET updated_at = created_at;
ALTER TABLE reports ALTER COLUMN updated_at SET NOT NULL;

CREATE INDEX idx_reports_created_at ON reports (created_at DESC);
