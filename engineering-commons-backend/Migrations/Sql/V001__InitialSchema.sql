-- =========================================================================================
-- Engineering Commons - Database Migration Script V001: Initial Schema
-- Target Engine: SQLite / Azure SQL Compatible
-- =========================================================================================

-- 1. User Access Requests Table
CREATE TABLE IF NOT EXISTS user_access_requests (
    Id TEXT PRIMARY KEY,
    UserEmail TEXT NOT NULL,
    RequestedRole TEXT NOT NULL,
    CurrentRole TEXT NOT NULL,
    Status TEXT NOT NULL,
    Reason TEXT,
    AdminEmail TEXT,
    AdminNotes TEXT,
    RequestedAt TEXT NOT NULL,
    ReviewedAt TEXT
);

-- 2. User Roles & Governance Table
CREATE TABLE IF NOT EXISTS user_roles (
    UserEmail TEXT PRIMARY KEY,
    Role TEXT NOT NULL,
    IsCertifiedReviewer INTEGER NOT NULL DEFAULT 0,
    GrantedBy TEXT,
    Notes TEXT,
    GrantedAt TEXT NOT NULL,
    UpdatedAt TEXT NOT NULL
);

-- 3. In-App Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    Id TEXT PRIMARY KEY,
    RecipientEmail TEXT NOT NULL,
    ThreadId TEXT,
    SubmissionId TEXT NOT NULL,
    ArtifactId TEXT NOT NULL DEFAULT '',
    ArtifactName TEXT NOT NULL DEFAULT '',
    ArtifactVersion TEXT NOT NULL DEFAULT '1.0.0',
    Type TEXT NOT NULL,
    Title TEXT NOT NULL,
    Message TEXT NOT NULL,
    ReferenceId TEXT,
    CreatedAt TEXT NOT NULL,
    ReadAt TEXT
);

-- 4. Artifact Certifications Table
CREATE TABLE IF NOT EXISTS artifact_certifications (
    Id TEXT PRIMARY KEY,
    ArtifactId TEXT NOT NULL,
    Status TEXT NOT NULL,
    CertifiedVersion TEXT NOT NULL DEFAULT '1.0.0',
    CertifiedByEmail TEXT,
    RevokedByEmail TEXT,
    RevocationReason TEXT,
    Reason TEXT,
    LastEvaluatedAt TEXT NOT NULL
);

-- 5. Usage & Telemetry Events Table
CREATE TABLE IF NOT EXISTS usage_events (
    Id TEXT PRIMARY KEY,
    UserId TEXT NOT NULL,
    ArtifactName TEXT,
    ArtifactType TEXT,
    ArtifactVersion TEXT,
    Action TEXT NOT NULL DEFAULT 'USE',
    Source TEXT NOT NULL DEFAULT 'VS_CODE',
    Platform TEXT NOT NULL DEFAULT 'EngineeringCommons',
    Timestamp TEXT NOT NULL,
    Workspace TEXT
);

-- 6. Peer Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
    Id TEXT PRIMARY KEY,
    ArtifactId TEXT NOT NULL,
    ArtifactName TEXT,
    ProducerEmail TEXT NOT NULL,
    ReviewerEmail TEXT,
    Feedback TEXT,
    Status TEXT NOT NULL,
    SubmittedAt TEXT NOT NULL,
    ReviewedAt TEXT,
    Content TEXT
);

-- 7. Review Threads Table
CREATE TABLE IF NOT EXISTS review_threads (
    Id TEXT PRIMARY KEY,
    SubmissionId TEXT NOT NULL,
    FilePath TEXT NOT NULL,
    LineNumber INTEGER NOT NULL,
    Status TEXT NOT NULL,
    CreatedAt TEXT NOT NULL,
    CreatedByEmail TEXT NOT NULL
);

-- 8. Review Messages Table
CREATE TABLE IF NOT EXISTS review_messages (
    Id TEXT PRIMARY KEY,
    ThreadId TEXT NOT NULL,
    AuthorEmail TEXT NOT NULL,
    Body TEXT NOT NULL,
    CreatedAt TEXT NOT NULL
);

-- 9. Review Comments Table
CREATE TABLE IF NOT EXISTS review_comments (
    Id TEXT PRIMARY KEY,
    SubmissionId TEXT NOT NULL,
    FilePath TEXT NOT NULL,
    StartLine INTEGER NOT NULL,
    EndLine INTEGER NOT NULL,
    AuthorEmail TEXT NOT NULL,
    CommentText TEXT NOT NULL,
    CreatedAt TEXT NOT NULL,
    ParentCommentId TEXT
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS IX_user_access_requests_UserEmail ON user_access_requests(UserEmail);
CREATE INDEX IF NOT EXISTS IX_user_access_requests_Status ON user_access_requests(Status);
CREATE INDEX IF NOT EXISTS IX_user_access_requests_RequestedAt ON user_access_requests(RequestedAt);
CREATE INDEX IF NOT EXISTS IX_user_roles_Role ON user_roles(Role);
CREATE INDEX IF NOT EXISTS IX_notifications_RecipientEmail ON notifications(RecipientEmail);
CREATE INDEX IF NOT EXISTS IX_usage_events_UserId ON usage_events(UserId);
CREATE INDEX IF NOT EXISTS IX_usage_events_ArtifactId ON usage_events(ArtifactId);
CREATE INDEX IF NOT EXISTS IX_reviews_ArtifactId ON reviews(ArtifactId);
CREATE INDEX IF NOT EXISTS IX_reviews_Status ON reviews(Status);
