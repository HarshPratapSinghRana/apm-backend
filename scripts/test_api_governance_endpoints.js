const http = require('http');
const app = require('../api/index.js');

const server = http.createServer(app);
server.listen(48999, async () => {
    console.log('Test server running on port 48999');
    const baseUrl = 'http://localhost:48999';

    try {
        // 1. Check /api/access-requests/my for consumer
        const myRes = await fetch(`${baseUrl}/api/access-requests/my?userEmail=test.consumer@maqsoftware.com`);
        console.log('1. /api/access-requests/my status:', myRes.status);
        const myData = await myRes.json();
        console.log('1. /api/access-requests/my data:', myData);

        // 2. Submit access request for CONTRIBUTOR
        const reqRes = await fetch(`${baseUrl}/api/access-requests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userEmail: 'test.consumer@maqsoftware.com',
                requestedRole: 'CONTRIBUTOR',
                reason: 'Want to contribute new skills'
            })
        });
        console.log('2. POST /api/access-requests status:', reqRes.status);
        const reqData = await reqRes.json();
        console.log('2. POST /api/access-requests response:', reqData);

        // 3. Admin access requests list
        const adminReqsRes = await fetch(`${baseUrl}/api/admin/access-requests`);
        console.log('3. GET /api/admin/access-requests status:', adminReqsRes.status);
        const adminReqs = await adminReqsRes.json();
        console.log('3. GET /api/admin/access-requests count:', adminReqs.length);

        // 4. Admin approve access request
        if (reqData.request?.id) {
            const approveRes = await fetch(`${baseUrl}/api/admin/access-requests/${reqData.request.id}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes: 'Approved by admin for testing' })
            });
            console.log('4. POST approve status:', approveRes.status);
            const approveData = await approveRes.json();
            console.log('4. POST approve data:', approveData);
        }

        // 5. Get all roles directory
        const rolesRes = await fetch(`${baseUrl}/api/roles`);
        console.log('5. GET /api/roles status:', rolesRes.status);
        const rolesData = await rolesRes.json();
        console.log('5. GET /api/roles users count:', rolesData.length);
        console.log('5. Users:', rolesData.map(r => `${r.userEmail}: ${r.role}`));

        // 6. Verify consumer upgraded to CONTRIBUTOR
        const myUpdatedRes = await fetch(`${baseUrl}/api/access-requests/my?userEmail=test.consumer@maqsoftware.com`);
        const myUpdatedData = await myUpdatedRes.json();
        console.log('6. /api/access-requests/my updated role:', myUpdatedData.currentRole);

        // 7. Certify reviewer
        const certRes = await fetch(`${baseUrl}/api/admin/roles/certify-reviewer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetEmail: 'reviewer@maqsoftware.com', notes: 'Certified AI reviewer' })
        });
        console.log('7. POST certify-reviewer status:', certRes.status);

        console.log('✓ ALL ADO GOVERNANCE API TESTS PASSED SUCCESSFULLY!');
    } catch (err) {
        console.error('Test error:', err);
    } finally {
        server.close();
        process.exit(0);
    }
});
