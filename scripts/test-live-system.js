const https = require('https');

function get(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, raw: data });
                }
            });
        }).on('error', reject);
    });
}

async function run() {
    const base = 'https://apm-backend.wittyriver-c768e02e.eastus.azurecontainerapps.io';

    console.log('=== 1. Health Check ===');
    const health = await get(`${base}/api/health`);
    console.log(health.body);

    console.log('\n=== 2. Download vp-agent Package ===');
    const vp = await get(`${base}/api/artifacts/vp-agent/download`);
    console.log(`Artifact Name: ${vp.body.name}`);
    console.log(`Files count: ${vp.body.files ? vp.body.files.length : 0}`);
    if (vp.body.files) {
        for (const f of vp.body.files) {
            console.log(`  -> File: ${f.path} (length: ${f.content.length} chars)`);
        }
    }

    console.log('\n=== 3. Bounties & My Work ===');
    const mw = await get(`${base}/api/bounties/my-work`);
    console.log(`Claimed Bounties: ${mw.body.claimedBounties ? mw.body.claimedBounties.length : 0}`);
    console.log(`Reviews: ${mw.body.reviews ? mw.body.reviews.length : 0}`);
    console.log(`Total Credits: ${mw.body.totalCreditsEarned}`);

    console.log('\n=== 4. Governance User Roles (From ADO Git) ===');
    const roles = await get(`${base}/api/admin/roles`);
    console.log(`Total Registered Users: ${Array.isArray(roles.body) ? roles.body.length : 0}`);
    if (Array.isArray(roles.body)) {
        roles.body.forEach(r => {
            console.log(`  -> ${r.userEmail} | Role: ${r.role} | Certified Reviewer: ${r.isCertifiedReviewer}`);
        });
    }

    console.log('\n=== 5. Governance Access Requests (From ADO Git) ===');
    const reqs = await get(`${base}/api/admin/access-requests`);
    console.log(`Total Access Requests: ${Array.isArray(reqs.body) ? reqs.body.length : 0}`);
    if (Array.isArray(reqs.body)) {
        reqs.body.forEach(r => {
            console.log(`  -> ID: ${r.id} | User: ${r.userEmail} | Requested: ${r.requestedRole} | Status: ${r.status}`);
        });
    }

    console.log('\n=== 6. Certifications (From ADO Git) ===');
    const certs = await get(`${base}/api/certifications`);
    console.log(certs.body);
}

run().catch(console.error);
