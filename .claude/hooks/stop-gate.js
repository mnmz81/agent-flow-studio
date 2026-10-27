#!/usr/bin/env node
// SubagentStop for the 4 pipeline agents: an agent may stop only with a valid completion signal.
//   1. Validate the signal (scripts/validate-signal.js): format, required outputs, SRS Gate 0-1,
//      AC → test traceability, coverage threshold.
//   2. Implementation Agent with verdict PASS: run lint/test/build once (when package.json exists).
// Exit 2 keeps the agent running and hands it the errors as its next instruction. On the second stop
// (stop_hook_active) it lets the agent end, to avoid a loop; the Orchestrator re-validates in signal-commit.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { validateSignal, extractSignal } = require('../../scripts/validate-signal');

const MEM_DIR = path.join(__dirname, '..', 'memory');
const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; } };

let input = {};
try {
  input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
} catch {}
if (input.stop_hook_active) process.exit(0);

const agent = input.agent_type;
const root = input.cwd ?? path.join(__dirname, '..', '..');
const text = input.last_assistant_message ?? '';
const errors = validateSignal(agent, text, {
  root,
  wm: readJson(process.env.WM_PATH ?? path.join(MEM_DIR, 'working-memory.json')),
  ltm: readJson(process.env.LTM_PATH ?? path.join(MEM_DIR, 'long-term-memory.json')),
});

if (!errors.length && agent === 'implementation-agent' && extractSignal(text)?.verdict === 'PASS' &&
    fs.existsSync(path.join(root, 'package.json'))) {
  try {
    execSync('npm run lint --if-present && npm test && npm run build --if-present', {
      cwd: root, env: { ...process.env, CI: 'true' }, stdio: 'pipe', timeout: 540_000,
    });
  } catch (e) {
    const log = `${e.stdout ?? ''}${e.stderr ?? ''}`.trim().split('\n').slice(-30).join('\n');
    errors.push(`local CI failed (npm run lint && npm test && npm run build). Last lines:\n${log}`);
  }
}

if (errors.length) {
  process.stderr.write(`[stop-gate] Not done yet. Fix these, then end again with a corrected signal:\n- ${errors.join('\n- ')}\n`);
  process.exit(2);
}
process.exit(0);
