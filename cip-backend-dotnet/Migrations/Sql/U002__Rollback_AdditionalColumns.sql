-- =========================================================================================
-- Engineering Commons - Database Rollback Script V002: Revert Additional Schema Columns
-- Target Engine: SQLite / Azure SQL Compatible
-- =========================================================================================

-- In SQLite (version 3.35.0+), DROP COLUMN is supported.
-- Revert added columns safely if rollback is triggered.

ALTER TABLE artifact_certifications DROP COLUMN RevokedAt;
ALTER TABLE artifact_certifications DROP COLUMN CertifiedAt;
ALTER TABLE artifact_certifications DROP COLUMN MetricsJson;
ALTER TABLE artifact_certifications DROP COLUMN CriteriaJson;

ALTER TABLE reviews DROP COLUMN LastSlaReminderSentAt;
ALTER TABLE reviews DROP COLUMN SlaDeadline;
ALTER TABLE reviews DROP COLUMN SlaTargetMinutes;
ALTER TABLE reviews DROP COLUMN ContentHash;
ALTER TABLE reviews DROP COLUMN AllowedConsumers;
ALTER TABLE reviews DROP COLUMN AllowedReviewers;
ALTER TABLE reviews DROP COLUMN AllowedContributors;
ALTER TABLE reviews DROP COLUMN IsPrivate;

ALTER TABLE usage_events DROP COLUMN Metadata;
ALTER TABLE usage_events DROP COLUMN SessionId;
ALTER TABLE usage_events DROP COLUMN EventType;
ALTER TABLE usage_events DROP COLUMN UserEmail;
ALTER TABLE usage_events DROP COLUMN ArtifactId;

