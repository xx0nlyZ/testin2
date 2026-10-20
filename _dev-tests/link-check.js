/* Link checker: verifies every relative href/src in HTML files resolves.
   Run: node _dev-tests/link-check.js */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'StudentPortalSample');
const SKIP_PREFIX = /^(https?:|mailto:|tel:|data:|javascript:|#|\/\/)/i;

const htmlFiles = [];
(function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === '.github') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.html')) htmlFiles.push(full);
    }
})(ROOT);

const broken = [];
let checked = 0;

for (const file of htmlFiles) {
    const html = fs.readFileSync(file, 'utf8');
    const refs = [];
    for (const m of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) refs.push(m[1]);

    for (const ref of refs) {
        if (SKIP_PREFIX.test(ref)) continue;
        const clean = ref.split('#')[0].split('?')[0];
        if (!clean) continue;
        checked++;
        const target = path.resolve(path.dirname(file), clean);
        if (!fs.existsSync(target)) {
            broken.push({ file: path.relative(ROOT, file), ref });
        }
    }
}

console.log(`HTML files scanned: ${htmlFiles.length}`);
console.log(`Relative references checked: ${checked}`);
if (broken.length) {
    console.log(`\nBROKEN LINKS (${broken.length}):`);
    const byFile = new Map();
    for (const b of broken) {
        if (!byFile.has(b.file)) byFile.set(b.file, []);
        byFile.get(b.file).push(b.ref);
    }
    for (const [file, refs] of byFile) {
        console.log('  ' + file);
        for (const r of refs) console.log('      -> ' + r);
    }
    process.exitCode = 1;
} else {
    console.log('\nAll relative links and asset references resolve.');
}
