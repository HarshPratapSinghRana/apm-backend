/**
 * Represents an artifact usage event sent to the backend for audit & tracking.
 * 
 * SECURITY INVARIANT:
 * This model and any usage logging MUST NEVER contain sensitive data such as:
 * - GitHub PAT
 * - Passwords
 * - Authentication tokens
 * - Full source code
 * - Prompt bodies
 * - Secrets or private keys
 */
export interface ArtifactUsageEvent {
    id?: string;
    userId?: string;
    userEmail?: string;
    artifactId?: string;
    artifactName?: string;
    artifactType?: string;
    artifactVersion?: string;
    platform?: 'EngineeringCommons' | 'GitHubCopilot' | 'Claude' | 'Other' | string;
    eventType?: 'INSTALL' | 'UPDATE' | 'UNINSTALL' | 'USE' | 'INVOKE' | 'CONTRIBUTE' | 'SUBMIT' | 'REVIEW' | 'APPROVE' | string;
    action?: string;
    source?: 'VS_CODE' | 'CLI' | 'GITHUB_COPILOT' | 'CLAUDE' | 'OTHER' | string;
    sessionId?: string;
    metadata?: string;
    timestamp: string;
    workspace?: string;
}

/**
 * Sanitizes any raw input before creating an ArtifactUsageEvent to guarantee
 * that secrets or auth tokens are never logged.
 */
export function createSanitizedUsageEvent(params: {
    action?: string;
    eventType?: string;
    userId?: string;
    userEmail?: string;
    artifactId?: string;
    artifactName?: string;
    artifactType?: string;
    artifactVersion?: string;
    platform?: string;
    source?: string;
    sessionId?: string;
    metadata?: string;
    workspace?: string;
}): ArtifactUsageEvent {
    const evType = (params.eventType || params.action || 'USE').toUpperCase();
    return {
        eventType: evType,
        action: evType,
        userId: params.userId || params.userEmail,
        userEmail: params.userEmail || params.userId,
        artifactId: params.artifactId ? String(params.artifactId).trim() : (params.artifactName ? String(params.artifactName).trim() : undefined),
        artifactName: params.artifactName ? String(params.artifactName).trim() : (params.artifactId ? String(params.artifactId).trim() : undefined),
        artifactType: params.artifactType ? String(params.artifactType).trim().toLowerCase() : undefined,
        artifactVersion: params.artifactVersion ? String(params.artifactVersion).trim() : '1.0.0',
        platform: params.platform ? String(params.platform).trim() : 'EngineeringCommons',
        source: params.source ? String(params.source).trim().toUpperCase() : 'VS_CODE',
        sessionId: params.sessionId ? String(params.sessionId).trim() : undefined,
        metadata: params.metadata ? String(params.metadata).trim() : undefined,
        timestamp: new Date().toISOString(),
        workspace: params.workspace ? String(params.workspace).trim() : undefined
    };
}

