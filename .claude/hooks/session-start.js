#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const LTM_PATH = path.join(__dirname, '..', 'memory', 'long-term-memory.json');

try {
  const ltm = JSON.parse(fs.readFileSync(LTM_PATH, 'utf8'));
  const context = [
    '## Long-term Memory (project knowledge)',
    '',
    '```json',
    JSON.stringify(ltm, null, 2),
    '```'
  ].join('\n');
  process.stdout.write(JSON.stringify({ additionalContext: context }));
} catch (err) {
  process.stderr.write(`[session-start] LTM not found or unreadable: ${err.message}\n`);
}
process.exit(0);
