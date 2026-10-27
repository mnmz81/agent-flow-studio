#!/usr/bin/env node
// Usage: node scripts/update-working-memory.js '{"phase":"phase0","phase0":{"status":"IN_PROGRESS"}}'
const fs = require('fs');
const path = require('path');

const WM_PATH = path.join(__dirname, '..', '.claude', 'memory', 'working-memory.json');

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] !== null &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      typeof result[key] === 'object' &&
      result[key] !== null &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(result[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

const patch = process.argv[2];
if (!patch) {
  process.stderr.write('Usage: node scripts/update-working-memory.js \'{"key":"value"}\'\n');
  process.exit(1);
}

let patchObj;
try {
  patchObj = JSON.parse(patch);
} catch (err) {
  process.stderr.write(`Invalid JSON: ${err.message}\n`);
  process.exit(1);
}

let current;
try {
  current = JSON.parse(fs.readFileSync(WM_PATH, 'utf8'));
} catch (err) {
  process.stderr.write(`Cannot read working-memory.json: ${err.message}\n`);
  process.exit(1);
}

const updated = deepMerge(current, patchObj);
fs.writeFileSync(WM_PATH, JSON.stringify(updated, null, 2) + '\n');
process.stdout.write(JSON.stringify(updated, null, 2) + '\n');
