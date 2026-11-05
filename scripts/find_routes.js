const fs = require('fs');
const content = fs.readFileSync('api/index.js', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
    if (line.includes("app.get(") || line.includes("app.use(")) {
        console.log(`${idx + 1}: ${line.trim().slice(0, 80)}`);
    }
});
