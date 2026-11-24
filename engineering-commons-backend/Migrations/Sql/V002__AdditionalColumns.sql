-- =========================================================================================
-- Engineering Commons - Database Migration Script V002: Additional Schema Columns
-- Target Engine: SQLite / Azure SQL Compatible
-- =========================================================================================

-- Safe incremental column additions for existing tables

-- 1. Usage Events table extensions
ALTER TABLE usage_events ADD COLUMN ArtifactId TEXT;
ALTER TABLE usage_events ADD COLUMN UserEmail TEXT;
ALTER TABLE usage_events ADD COLUMN EventType TEXT;
ALTER TABLE usage_events ADD COLUMN SessionId TEXT;
ALTER TABLE usage_events ADD COLUMN Metadata TEXT;

-- 2. Reviews table extensions
ALTER TABLE reviews ADD COLUMN IsPrivate INTEGER DEFAULT 0;
ALTER TABLE reviews ADD COLUMN AllowedContributors TEXT;
ALTER TABLE reviews ADD COLUMN AllowedReviewers TEXT;
ALTER TABLE reviews ADD COLUMN AllowedConsumers TEXT;
ALTER TABLE reviews ADD COLUMN ContentHash TEXT;
ALTER TABLE reviews ADD COLUMN SlaTargetMinutes INTEGER DEFAULT 1440;
ALTER TABLE reviews ADD COLUMN SlaDeadline TEXT;
ALTER TABLE reviews ADD COLUMN LastSlaReminderSentAt TEXT;

-- 3. Artifact Certifications table extensions
ALTER TABLE artifact_certifications ADD COLUMN CriteriaJson TEXT;
ALTER TABLE artifact_certifications ADD COLUMN MetricsJson TEXT;
ALTER TABLE artifact_certifications ADD COLUMN CertifiedAt TEXT;
ALTER TABLE artifact_certifications ADD COLUMN RevokedAt TEXT;

