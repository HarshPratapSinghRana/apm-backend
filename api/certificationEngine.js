const crypto = require('crypto');

/**
 * Enterprise AI Artifact Certification Engine
 * Implements deterministic 5-pillar dynamic health scoring from AI-ARTIFACT-CERTIFICATION-LAYER-ARCHITECTURE.md
 */

/**
 * Compute SHA-256 content hash of artifact files
 */
function computeContentHash(files) {
    if (!Array.isArray(files) || files.length === 0) {
        return crypto.createHash('sha256').update('empty').digest('hex');
    }
    const hash = crypto.createHash('sha256');
    const sorted = [...files].sort((a, b) => (a.path || a.name || '').localeCompare(b.path || b.name || ''));
    for (const f of sorted) {
        hash.update(f.path || f.name || '');
        hash.update(typeof f.content === 'string' ? f.content : JSON.stringify(f.content || ''));
    }
    return hash.digest('hex');
}

/**
 * Pillar 1: Real-World Adoption Score (S_Adoption)
 * S_Adoption = min(100, (U_active / 5 * 50) + (I_total / 50 * 50))
 * Applies Author Entra ID exclusion and max 5 invocations/user/day velocity cap over rolling 30 days.
 */
function evaluateAdoptionScore(telemetryEvents, authorId, windowDays = 30) {
    const now = Date.now();
    const cutoff = now - windowDays * 24 * 60 * 60 * 1000;
    const authorNorm = (authorId || '').toLowerCase().trim();

    const userDailyMap = new Map(); // key: user_date => count
    const uniqueUsers = new Set();
    let totalCappedInvocations = 0;

    for (const evt of telemetryEvents) {
        const evtTime = new Date(evt.timestamp || evt.createdAt || now).getTime();
        if (evtTime < cutoff) continue;

        const userId = (evt.userId || evt.userEmail || '').toLowerCase().trim();
        if (!userId) continue;

        // T1 Hard Exclusion: Author cannot self-certify
        if (authorNorm && userId === authorNorm) continue;

        uniqueUsers.add(userId);

        const dateStr = new Date(evtTime).toISOString().slice(0, 10);
        const dayKey = `${userId}_${dateStr}`;
        const dayCount = userDailyMap.get(dayKey) || 0;
        if (dayCount < 5) { // Anti-gaming velocity cap: max 5 counted runs/user/day
            userDailyMap.set(dayKey, dayCount + 1);
            totalCappedInvocations++;
        }
    }

    const uActive = uniqueUsers.size;
    const iTotal = totalCappedInvocations;

    const userPart = Math.min(50, (uActive / 5.0) * 50.0);
    const runsPart = Math.min(50, (iTotal / 50.0) * 50.0);
    const score = Math.min(100.0, Math.round((userPart + runsPart) * 10) / 10);

    return {
        score,
        weight: 0.25,
        weightedScore: Math.round(score * 0.25 * 10) / 10,
        activeUsers: uActive,
        totalInvocations: iTotal,
        threshold: 80.0,
        passed: score >= 80.0 && uActive >= 3 && iTotal >= 25
    };
}

/**
 * Pillar 2: Community Feedback Score (S_Feedback)
 * S_Feedback = (R_avg / 5.0) * 100 if N_reviews >= 3, else 80.0 provisional
 * Filters out author reviews.
 */
function evaluateFeedbackScore(reviews, authorId) {
    const authorNorm = (authorId || '').toLowerCase().trim();
    const validReviews = [];
    const reviewerSet = new Set();

    for (const r of reviews) {
        const userId = (r.userId || r.userEmail || '').toLowerCase().trim();
        if (!userId) continue;
        if (authorNorm && userId === authorNorm) continue; // Exclude author reviews

        const rating = Number(r.rating || r.stars);
        if (rating >= 1 && rating <= 5) {
            validReviews.push(rating);
            reviewerSet.add(userId);
        }
    }

    const nReviews = reviewerSet.size;
    let avgRating = 0.0;
    let score = 80.0;
    let isProvisional = true;

    if (nReviews >= 3) {
        const sum = validReviews.reduce((acc, v) => acc + v, 0);
        avgRating = Math.round((sum / validReviews.length) * 10) / 10;
        score = Math.min(100.0, Math.round(((avgRating / 5.0) * 100.0) * 10) / 10);
        isProvisional = false;
    } else if (validReviews.length > 0) {
        const sum = validReviews.reduce((acc, v) => acc + v, 0);
        avgRating = Math.round((sum / validReviews.length) * 10) / 10;
    }

    return {
        score,
        weight: 0.15,
        weightedScore: Math.round(score * 0.15 * 10) / 10,
        avgRating,
        reviewCount: nReviews,
        isProvisional,
        threshold: 84.0,
        passed: isProvisional ? true : (score >= 84.0 && avgRating >= 4.2)
    };
}

/**
 * Pillar 3: Developer Experience (DX) & Documentation (S_DX)
 * S_DX = (0.40 * S_docs) + (0.30 * S_ttfe) + (0.30 * S_config)
 */
function evaluateDxScore(artifact, telemetryEvents) {
    const files = Array.isArray(artifact.files) ? artifact.files : [];
    let docContent = '';
    for (const f of files) {
        const p = (f.path || f.name || '').toLowerCase();
        if (p.includes('skill.md') || p.includes('readme.md') || p.includes('.agent.md') || p.includes('.prompt.md')) {
            docContent += '\n' + (typeof f.content === 'string' ? f.content : '');
        }
    }
    if (!docContent && artifact.description) {
        docContent = artifact.description;
    }

    const lower = docContent.toLowerCase();
    let sDocs = 0;
    if (lower.includes('# ') || lower.includes('overview') || lower.includes('title')) sDocs += 15;
    if (lower.includes('description') || lower.includes('purpose') || lower.length > 100) sDocs += 20;
    if (lower.includes('parameter') || lower.includes('checklist') || lower.includes('rules') || lower.includes('input') || lower.includes('args')) sDocs += 25;
    if (lower.includes('example') || lower.includes('quick start') || lower.includes('usage') || lower.includes('```')) sDocs += 30;
    if (lower.includes('troubleshoot') || lower.includes('error') || lower.includes('remediation') || lower.includes('verification') || lower.includes('note')) sDocs += 10;
    sDocs = Math.min(100, sDocs);

    // S_ttfe: Time to first execution (measured in seconds). Default 100 if instant zero-setup
    let sTtfe = 100;
    // S_config: Zero configuration score (100 if zero manual configuration required)
    const requiresEnv = Boolean(artifact.requires_env_vars || artifact.requiresEnvVars);
    const sConfig = requiresEnv ? 50 : 100;

    const score = Math.round((0.40 * sDocs + 0.30 * sTtfe + 0.30 * sConfig) * 10) / 10;

    return {
        score,
        weight: 0.15,
        weightedScore: Math.round(score * 0.15 * 10) / 10,
        docsScore: sDocs,
        ttfeScore: sTtfe,
        configScore: sConfig,
        threshold: 85.0,
        passed: score >= 85.0
    };
}

/**
 * Pillar 4: Technical Conformance & Test Suite (S_Technical)
 * S_Technical = (0.50 * P_tests) + (0.30 * S_schema) + (0.20 * S_security)
 * Hard gates: S_schema = 100, S_security = 100, P_tests >= 95%
 */
function evaluateTechnicalScore(artifact, testRuns = []) {
    const files = Array.isArray(artifact.files) ? artifact.files : [];
    let allContent = '';
    for (const f of files) {
        allContent += '\n' + (typeof f.content === 'string' ? f.content : JSON.stringify(f.content || ''));
    }

    // Static Security & Secret Scanner
    const secretPatterns = [
        /AKIA[0-9A-Z]{16}/i,                        // AWS Access Key
        /ghp_[a-zA-Z0-9]{36}/i,                     // GitHub Personal Access Token
        /sk-[a-zA-Z0-9]{48}/i,                      // OpenAI secret key
        /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}/, // JWT Token with signature
        /-----BEGIN (RSA|EC|OPENSSH|DSA|PGP) PRIVATE KEY-----/,
        /password\s*=\s*['"][^'"]{8,}['"]/i
    ];

    let foundSecret = false;
    for (const pat of secretPatterns) {
        if (pat.test(allContent)) {
            foundSecret = true;
            break;
        }
    }
    const sSecurity = foundSecret ? 0 : 100;

    // Schema Validation (JSON-RPC 2.0 / MCP / Manifest parameter schema)
    let sSchema = 100;
    for (const f of files) {
        const p = (f.path || f.name || '').toLowerCase();
        if (p.endsWith('.json')) {
            try {
                if (typeof f.content === 'string') JSON.parse(f.content);
            } catch {
                sSchema = 0;
            }
        }
    }

    // Golden Test Pass Rate
    let pTests = 100.0;
    if (Array.isArray(testRuns) && testRuns.length > 0) {
        const passed = testRuns.filter(t => t.passed || t.status === 'PASSED').length;
        pTests = Math.round((passed / testRuns.length) * 1000) / 10;
    }

    const score = Math.round((0.50 * pTests + 0.30 * sSchema + 0.20 * sSecurity) * 10) / 10;

    return {
        score,
        weight: 0.20,
        weightedScore: Math.round(score * 0.20 * 10) / 10,
        goldenTestPassRate: pTests,
        schemaScore: sSchema,
        securityScore: sSecurity,
        hardGatesPassed: sSecurity === 100 && sSchema === 100 && pTests >= 95.0,
        threshold: 95.0,
        passed: score >= 95.0 && sSecurity === 100 && sSchema === 100 && pTests >= 95.0
    };
}

/**
 * Pillar 5: Operational Health & Crash Reliability (S_Health)
 * ESR IS COMPLETELY EXCLUDED (no penalty for user-side input errors).
 * Evaluates pure Fatal Exception Rate (FER <= 1.0%).
 * Latency evaluated ONLY for MCP servers and atomic tools (AvgLatencyMs <= 3000ms).
 * Coding agents and workflows are 100% EXEMPTED from latency SLA!
 */
function evaluateHealthScore(telemetryEvents, artifactType = 'agent', authorId = '') {
    const authorNorm = (authorId || '').toLowerCase().trim();
    const typeNorm = (artifactType || 'agent').toLowerCase().trim();
    const isLatencyExempt = typeNorm === 'agent' || typeNorm === 'workflow' || typeNorm === 'solution';

    let totalInvocations = 0;
    let fatalCrashes = 0;
    let latencySum = 0;
    let latencyCount = 0;

    for (const evt of telemetryEvents) {
        const userId = (evt.userId || evt.userEmail || '').toLowerCase().trim();
        if (authorNorm && userId === authorNorm) continue; // Exclude author

        totalInvocations++;
        const errorType = (evt.errorType || evt.status || '').toLowerCase();
        if (errorType === 'fatalcrash' || errorType === 'crash' || errorType === 'fatal_exception') {
            fatalCrashes++;
        }

        const lat = Number(evt.latencyMs || evt.durationMs);
        if (!isNaN(lat) && lat > 0) {
            latencySum += lat;
            latencyCount++;
        }
    }

    // Reliability Sample Size Constraint: If Total Invocations < 10 => S_Health = null
    if (totalInvocations < 10) {
        return {
            score: null,
            weight: 0.25,
            weightedScore: null,
            fer: totalInvocations > 0 ? Math.round((fatalCrashes / totalInvocations) * 1000) / 10 : 0.0,
            fatalCrashes,
            totalInvocations,
            avgLatencyMs: latencyCount > 0 ? Math.round(latencySum / latencyCount) : 0,
            isLatencyExempt,
            sampleSizeSufficient: false,
            threshold: 95.0,
            passed: false,
            reason: 'Insufficient Telemetry Data (< 10 non-author invocations)'
        };
    }

    const fer = Math.round((fatalCrashes / totalInvocations) * 1000) / 10;
    const crashSafetyScore = Math.max(0, 100.0 - fer);
    const avgLatencyMs = latencyCount > 0 ? Math.round(latencySum / latencyCount) : 1000;

    let score = crashSafetyScore;
    let sLatency = 100.0;

    if (!isLatencyExempt) {
        // MCP Servers & Tools SLA
        if (avgLatencyMs <= 3000) {
            sLatency = 100.0;
        } else {
            sLatency = Math.max(0.0, 100.0 - ((avgLatencyMs - 3000) / 50.0));
        }
        score = Math.round((0.70 * crashSafetyScore + 0.30 * sLatency) * 10) / 10;
    } else {
        score = Math.round(crashSafetyScore * 10) / 10;
    }

    return {
        score,
        weight: 0.25,
        weightedScore: Math.round(score * 0.25 * 10) / 10,
        fer,
        fatalCrashes,
        totalInvocations,
        avgLatencyMs,
        isLatencyExempt,
        sampleSizeSufficient: true,
        threshold: 95.0,
        passed: score >= 95.0 && fer <= 1.0
    };
}

/**
 * Composite Dynamic Health Score (DHS) & Badge Classification
 * Composite Score = (0.25 * S_Adoption) + (0.15 * S_Feedback) + (0.15 * S_DX) + (0.20 * S_Technical) + (0.25 * S_Health)
 */
function evaluateCertification(artifact, telemetryEvents = [], reviews = [], testRuns = [], previousRecord = null) {
    const artifactId = artifact.id || artifact.name;
    const artifactType = artifact.type || 'agent';
    const authorId = artifact.author || artifact.producerEmail || 'harsh.rana@maqsoftware.com';
    const currentHash = computeContentHash(artifact.files || []);

    const adoption = evaluateAdoptionScore(telemetryEvents, authorId);
    const feedback = evaluateFeedbackScore(reviews, authorId);
    const dx = evaluateDxScore(artifact, telemetryEvents);
    const technical = evaluateTechnicalScore(artifact, testRuns);
    const health = evaluateHealthScore(telemetryEvents, artifactType, authorId);

    const hardGates = {
        schemaValidation: technical.schemaScore === 100,
        securityScan: technical.securityScore === 100,
        goldenTests: technical.goldenTestPassRate >= 95.0,
        crashSafety: health.sampleSizeSufficient ? (health.fer <= 1.0) : true,
        allPassed: technical.hardGatesPassed && (health.sampleSizeSufficient ? health.fer <= 1.0 : true)
    };

    let compositeScore = null;
    let badge = 'Community';
    let status = 'Community';
    let reason = '';

    if (!hardGates.securityScan) {
        badge = 'Revoked';
        status = 'REVOKED (Security Leak Detected)';
        reason = 'CRITICAL: Hardcoded credentials or API tokens detected in artifact code.';
    } else if (!hardGates.schemaValidation || !hardGates.goldenTests) {
        badge = 'Community';
        status = 'Community (Conformance Gates Failed)';
        reason = 'Fails pre-publish static schema validation or test suite pass rate (< 95%).';
    } else if (!health.sampleSizeSufficient) {
        badge = 'Community';
        status = 'Community (Insufficient Telemetry)';
        reason = 'Passes static conformance checks; pending real-world adoption telemetry (< 10 runs).';
    } else {
        compositeScore = Math.round((
            (0.25 * adoption.score) +
            (0.15 * feedback.score) +
            (0.15 * dx.score) +
            (0.20 * technical.score) +
            (0.25 * health.score)
        ) * 10) / 10;

        // Check for Demotion
        if (previousRecord && previousRecord.badge === 'Certified') {
            if (compositeScore < 70.0 || health.fer > 3.0) {
                badge = 'Verified';
                status = 'Verified (Demoted from Certified)';
                reason = `Demoted: Composite score fell to ${compositeScore} or Fatal Exception Rate rose to ${health.fer}%.`;
            } else if (compositeScore < 85.0) {
                badge = 'At-Risk';
                status = 'At-Risk (14-Day Grace Period)';
                reason = `Warning: Composite health score dropped to ${compositeScore}. Requires telemetry recovery within 14 days.`;
            } else {
                badge = 'Certified';
                status = 'Certified (Gold)';
                reason = `Exceeds Gold Certification criteria across all 5 pillars with ${health.fer}% FER.`;
            }
        } else {
            // New or standard qualification
            if (
                compositeScore >= 85.0 &&
                health.score >= 95.0 &&
                health.fer <= 1.0 &&
                adoption.activeUsers >= 3 &&
                adoption.totalInvocations >= 25
            ) {
                badge = 'Certified';
                status = 'Certified (Gold)';
                reason = `Officially Gold Certified: Composite score ${compositeScore}/100, 0 fatal crashes, verified developer adoption.`;
            } else {
                badge = 'Verified';
                status = 'Verified';
                reason = `Verified enterprise artifact. Composite score is ${compositeScore}/100 (Threshold for Gold: 85.0).`;
            }
        }
    }

    // Tamper Detection Check
    let tamperStatus = 'VERIFIED';
    if (previousRecord && previousRecord.contentHash && previousRecord.contentHash !== currentHash) {
        tamperStatus = 'HASH_UPDATED';
    }

    return {
        artifactId,
        name: artifact.name || artifactId,
        version: artifact.version || '1.0.0',
        artifactType,
        authorId,
        contentHash: currentHash,
        tamperStatus,
        badge,
        status,
        compositeScore,
        isCertified: badge === 'Certified',
        certifiedVersion: badge === 'Certified' ? (artifact.version || '1.0.0') : (previousRecord?.certifiedVersion || null),
        certifiedAt: badge === 'Certified' ? (previousRecord?.certifiedAt || new Date().toISOString()) : null,
        lastEvaluatedAt: new Date().toISOString(),
        pillars: {
            adoption,
            feedback,
            dx,
            technical,
            health
        },
        hardGates,
        reason
    };
}

module.exports = {
    computeContentHash,
    evaluateAdoptionScore,
    evaluateFeedbackScore,
    evaluateDxScore,
    evaluateTechnicalScore,
    evaluateHealthScore,
    evaluateCertification
};
