const fs = require('fs');
const path = require('path');

const ORG = 'MAQInternalCIP-Engineering-Commons';
const PROJECT = encodeURIComponent('Engineering Commons');
const REPO = encodeURIComponent('Engineering Commons');
const PAT = process.env.AZURE_DEVOPS_PAT || 'A2RW5UcHDolfE7HztH9l9Ktj2kDF7Rzka3azqA39eTJR6EGFU9lbJQQJ99CJACAAAAAqDT5DAAASAZDO2Izl';
const BRANCH = 'main';
const auth = Buffer.from(':' + PAT).toString('base64');

async function migrateSqliteToAdo() {
    console.log('--- Migrating Real Team Data to Azure DevOps Git ---');

    // Real team user roles
    const realUserRoles = [
        {
            userEmail: 'harsh.rana@maqsoftware.com',
            role: 'ADMIN',
            isCertifiedReviewer: true,
            grantedBy: 'SYSTEM',
            notes: 'Platform SuperAdmin & Certified Reviewer Lead',
            grantedAt: '2026-09-09T17:39:43.000Z',
            updatedAt: new Date().toISOString()
        },
        {
            userEmail: 'rishabhy@maqsoftware.com',
            role: 'CONTRIBUTOR',
            isCertifiedReviewer: false,
            grantedBy: 'SYSTEM',
            notes: 'Active Contributor & AI Engineer',
            grantedAt: '2026-09-16T10:38:11.810Z',
            updatedAt: new Date().toISOString()
        },
        {
            userEmail: 'vivekprasad@maqsoftware.com',
            role: 'CONTRIBUTOR',
            isCertifiedReviewer: false,
            grantedBy: 'SYSTEM',
            notes: 'AI Engineer & Artifact Publisher',
            grantedAt: '2026-09-20T08:15:00.000Z',
            updatedAt: new Date().toISOString()
        },
        {
            userEmail: 'reviewer@maqsoftware.com',
            role: 'REVIEWER',
            isCertifiedReviewer: true,
            grantedBy: 'harsh.rana@maqsoftware.com',
            notes: 'Certified Reviewer for AI Leap',
            grantedAt: '2026-09-09T17:39:43.000Z',
            updatedAt: new Date().toISOString()
        },
        {
            userEmail: 'producer@maqsoftware.com',
            role: 'CONTRIBUTOR',
            isCertifiedReviewer: false,
            grantedBy: 'harsh.rana@maqsoftware.com',
            notes: 'Artifact Producer with publishing permissions',
            grantedAt: '2026-09-09T17:39:43.000Z',
            updatedAt: new Date().toISOString()
        },
        {
            userEmail: 'consumer@company.com',
            role: 'REVIEWER',
            isCertifiedReviewer: false,
            grantedBy: 'harsh.rana@maqsoftware.com',
            notes: 'Approved for reviewer permissions',
            grantedAt: '2026-09-09T17:39:43.000Z',
            updatedAt: '2026-09-09T17:41:05.670Z'
        },
        {
            userEmail: 'producer@company.com',
            role: 'CONTRIBUTOR',
            isCertifiedReviewer: false,
            grantedBy: 'SYSTEM',
            notes: 'Producer with artifact publishing permissions',
            grantedAt: '2026-09-09T17:39:43.000Z',
            updatedAt: new Date().toISOString()
        },
        {
            userEmail: 'consumer@test.com',
            role: 'CONSUMER',
            isCertifiedReviewer: false,
            grantedBy: 'SYSTEM',
            notes: 'Test Consumer account',
            grantedAt: '2026-09-09T17:39:43.000Z',
            updatedAt: new Date().toISOString()
        }
    ];

    // Real team access requests
    const realAccessRequests = [
        {
            id: 'req-21425ee6',
            userEmail: 'rishabhy@maqsoftware.com',
            requestedRole: 'REVIEWER',
            currentRole: 'CONTRIBUTOR',
            status: 'Pending',
            reason: 'Requesting Reviewer permissions for reviewing WCAG accessibility agents.',
            adminEmail: 'harsh.rana@maqsoftware.com',
            requestedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
        },
        {
            id: 'req-8f822992',
            userEmail: 'vivekprasad@maqsoftware.com',
            requestedRole: 'CONTRIBUTOR',
            currentRole: 'CONSUMER',
            status: 'Pending',
            reason: 'I would like to contribute and publish new skills to the AI Artifacts marketplace.',
            adminEmail: 'harsh.rana@maqsoftware.com',
            requestedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString()
        },
        {
            id: 'req-0bc92e5e',
            userEmail: 'producer@company.com',
            requestedRole: 'CONTRIBUTOR',
            currentRole: 'CONSUMER',
            status: 'Approved',
            reason: 'Need access to publish team artifacts',
            adminEmail: 'harsh.rana@maqsoftware.com',
            adminNotes: 'Approved for contribution privileges',
            requestedAt: '2026-09-10T06:56:03.000Z',
            reviewedAt: '2026-09-10T06:56:15.000Z'
        },
        {
            id: 'req-eae37b33',
            userEmail: 'consumer@company.com',
            requestedRole: 'REVIEWER',
            currentRole: 'CONTRIBUTOR',
            status: 'Approved',
            reason: 'Need reviewer access to inspect AI artifacts and prompts',
            adminEmail: 'harsh.rana@maqsoftware.com',
            adminNotes: 'Approved for reviewer permissions',
            requestedAt: '2026-09-09T17:21:11.000Z',
            reviewedAt: '2026-09-09T17:41:05.000Z'
        }
    ];

    // 1. Get branch commit
    const refsUrl = `https://dev.azure.com/${ORG}/${PROJECT}/_apis/git/repositories/${REPO}/refs?filter=heads/${BRANCH}&api-version=7.0`;
    const refResp = await fetch(refsUrl, { headers: { Authorization: `Basic ${auth}` } });
    const refData = await refResp.json();
    let oldObjectId = refData?.value?.[0]?.objectId || "0000000000000000000000000000000000000000";

    const rolesJson = JSON.stringify({
        updatedAt: new Date().toISOString(),
        organization: "MAQ Software",
        totalUsers: realUserRoles.length,
        userRoles: realUserRoles
    }, null, 2);

    const requestsJson = JSON.stringify({
        updatedAt: new Date().toISOString(),
        totalRequests: realAccessRequests.length,
        requests: realAccessRequests
    }, null, 2);

    const pushPayload = {
        refUpdates: [
            {
                name: `refs/heads/${BRANCH}`,
                oldObjectId: oldObjectId
            }
        ],
        commits: [
            {
                comment: `[Governance Migration] Seed real team user roles and access requests (${new Date().toISOString()})`,
                changes: [
                    {
                        changeType: 'edit',
                        item: { path: '/governance/user-roles.json' },
                        newContent: { content: rolesJson, contentType: 'rawtext' }
                    },
                    {
                        changeType: 'edit',
                        item: { path: '/governance/access-requests.json' },
                        newContent: { content: requestsJson, contentType: 'rawtext' }
                    }
                ]
            }
        ]
    };

    const pushUrl = `https://dev.azure.com/${ORG}/${PROJECT}/_apis/git/repositories/${REPO}/pushes?api-version=7.0`;
    const pushResp = await fetch(pushUrl, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(pushPayload)
    });

    console.log('Push response status:', pushResp.status);
    if (pushResp.status === 200 || pushResp.status === 201) {
        console.log('✓ Successfully transferred all team user roles and access requests to Azure DevOps!');
    } else {
        console.error('Push failed:', await pushResp.text());
    }
}

migrateSqliteToAdo();
