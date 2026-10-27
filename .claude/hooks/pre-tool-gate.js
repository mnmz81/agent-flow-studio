#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const input = JSON.parse(fs.readFileSync(0, 'utf8'));
const tool = input.tool_name;
const filePath = input.tool_input?.file_path ?? '';
const cmd = input.tool_input?.command ?? '';

// 1. Memory is Orchestrator-only — no sub-agent writes it
if ((tool === 'Write' || tool === 'Edit') && filePath.includes('.claude/memory/')) {
  process.stderr.write('[gate] memory is control-plane; only the Orchestrator writes it.\n');
  process.exit(2);
}

// 2. Destructive bash
if (tool === 'Bash' && /rm\s+-rf|git\s+push\s+--force|DROP\s+TABLE/i.test(cmd)) {
  process.stderr.write('[gate] destructive command blocked.\n');
  process.exit(2);
}

// 3. Green-retry cap (read counter the Orchestrator maintains)
const WM_PATH = path.join(__dirname, '..', 'memory', 'working-memory.json');
try {
  const wm = JSON.parse(fs.readFileSync(WM_PATH, 'utf8'));
  if ((wm.stage1?.greenRetries ?? 0) > 3) {
    process.stderr.write('[gate] green-retry cap hit — escalate to human, do not loop.\n');
    process.exit(2);
  }
} catch (err) {
  // Working memory may not exist yet — allow
}

process.exit(0);
