-- =========================================================================================
-- Engineering Commons - Database Rollback Script V001: Revert Initial Schema
-- Target Engine: SQLite / Azure SQL Compatible
-- =========================================================================================

DROP INDEX IF EXISTS IX_reviews_Status;
DROP INDEX IF EXISTS IX_reviews_ArtifactId;
DROP INDEX IF EXISTS IX_usage_events_ArtifactId;
DROP INDEX IF EXISTS IX_usage_events_UserId;
DROP INDEX IF EXISTS IX_notifications_RecipientEmail;
DROP INDEX IF EXISTS IX_user_roles_Role;
DROP INDEX IF EXISTS IX_user_access_requests_RequestedAt;
DROP INDEX IF EXISTS IX_user_access_requests_Status;
DROP INDEX IF EXISTS IX_user_access_requests_UserEmail;

DROP TABLE IF EXISTS review_comments;
DROP TABLE IF EXISTS review_messages;
DROP TABLE IF EXISTS review_threads;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS usage_events;
DROP TABLE IF EXISTS artifact_certifications;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS user_access_requests;
