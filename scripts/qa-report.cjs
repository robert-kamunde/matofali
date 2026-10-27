// Builds docs/QA_REPORT.md tables from Vitest and Playwright JSON reports.
// Usage: node scripts/qa-report.cjs <vitest.json> <playwright.json>
const fs = require('fs');
const [vPath, pPath] = process.argv.slice(2);
const v = JSON.parse(fs.readFileSync(vPath, 'utf8'));
const p = JSON.parse(fs.readFileSync(pPath, 'utf8'));
const esc = (s) => String(s).replace(/\|/g, '\\|');
const out = [];
out.push(`### Unit tests (Vitest): ${v.numPassedTests} passed, ${v.numFailedTests} failed, ${v.numPendingTests} skipped of ${v.numTotalTests}`, '');
out.push('| File | Test | Result |', '| --- | --- | --- |');
for (const f of v.testResults) {
  const file = f.name.split('/tests/')[1];
  for (const a of f.assertionResults) {
    out.push(`| ${file} | ${esc([...a.ancestorTitles, a.title].join(' › '))} | ${a.status === 'passed' ? 'PASS' : a.status.toUpperCase()} |`);
  }
}
const rows = []; const count = { passed: 0, failed: 0, skipped: 0 };
const walk = (suite, file) => {
  for (const spec of suite.specs || []) for (const t of spec.tests) {
    const st = t.results.at(-1)?.status || 'skipped';
    const key = st === 'passed' ? 'passed' : st === 'skipped' ? 'skipped' : 'failed';
    count[key]++;
    rows.push(`| ${file} | ${esc(spec.title)} | ${t.projectName} | ${key === 'passed' ? 'PASS' : key === 'skipped' ? 'SKIPPED (by design)' : 'FAIL'} |`);
  }
  for (const s of suite.suites || []) walk(s, file);
};
for (const s of p.suites) walk(s, s.file);
out.push('', `### Browser tests (Playwright): ${count.passed} passed, ${count.failed} failed, ${count.skipped} skipped`, '');
out.push('| File | Test | Device profile | Result |', '| --- | --- | --- | --- |', ...rows);
process.stdout.write(out.join('\n') + '\n');
