const org = 'MAQInternalCIP-Engineering-Commons';
const project = encodeURIComponent('Engineering Commons');
const repo = encodeURIComponent('Engineering Commons');
const pat = process.env.AZURE_DEVOPS_PAT || 'A2RW5UcHDolfE7HztH9l9Ktj2kDF7Rzka3azqA39eTJR6EGFU9lbJQQJ99CJACAAAAAqDT5DAAASAZDO2Izl';
const auth = Buffer.from(':' + pat).toString('base64');

async function verify() {
    const r1 = await fetch(`https://dev.azure.com/${org}/${project}/_apis/git/repositories/${repo}/items?path=/governance/user-roles.json&api-version=7.0`, {
        headers: { Authorization: `Basic ${auth}` }
    });
    console.log('user-roles status:', r1.status);
    console.log('user-roles content:', await r1.text());

    const r2 = await fetch(`https://dev.azure.com/${org}/${project}/_apis/git/repositories/${repo}/items?path=/governance/access-requests.json&api-version=7.0`, {
        headers: { Authorization: `Basic ${auth}` }
    });
    console.log('access-requests status:', r2.status);
    console.log('access-requests content:', await r2.text());
}

verify();
