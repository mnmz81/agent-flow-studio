#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const input = JSON.parse(fs.readFileSync(0, 'utf8'));
const tool = input.tool_name;
const filePath = input.tool_input?.file_path ?? input.tool_input?.notebook_path ?? '';
const cmd = input.tool_input?.command ?? '';
const isSubAgent = Boolean(input.agent_id); // agent_id is only set for tool calls inside a subagent

const MEM_DIR = path.join(__dirname, '..', 'memory');

function block(msg) {
  process.stderr.write(`[gate] ${msg}\n`);
  process.exit(2);
}

// Resolve symlinks on the deepest existing ancestor, so a link can't point a write into memory
function realResolve(p) {
  const abs = path.resolve(input.cwd ?? process.cwd(), p);
  let dir = abs;
  while (!fs.existsSync(dir) && path.dirname(dir) !== dir) dir = path.dirname(dir);
  try {
    return path.join(fs.realpathSync(dir), path.relative(dir, abs));
  } catch {
    return abs;
  }
}

// 1. Memory is Orchestrator-only. File tools never write it (Orchestrator uses
//    scripts/update-working-memory.js); sub-agents may not touch it from Bash either.
if (['Write', 'Edit', 'MultiEdit', 'NotebookEdit'].includes(tool) && filePath) {
  const target = realResolve(filePath);
  const memDir = realResolve(MEM_DIR);
  if (target === memDir || target.startsWith(memDir + path.sep)) {
    block('memory is control-plane; only the Orchestrator writes it.');
  }
}
if (tool === 'Bash' && isSubAgent && /\.claude\/memory|update-working-memory/.test(cmd)) {
  block('memory is control-plane; only the Orchestrator writes it.');
}

// 2. Destructive bash: recursive rm (any flag form, not git rm), force push (any form), DROP TABLE.
// shortcut: a denylist can't see through variables or eval; per-agent allowlists are tracked in issue #4.
if (tool === 'Bash') {
  const recursiveRm = /(?<![\w.\/-])(?<!git\s+)rm\s+(?:[^;&|]*\s)?(?:-[a-zA-Z]*[rR][a-zA-Z]*|--recursive)(?=[\s'"]|$)/;
  const forcePush = /\bgit\s+push\b[^;&|]*?\s(?:--force(?:-with-lease)?\b|-[a-zA-Z]*f[a-zA-Z]*(?=\s|$)|\+\S)/;
  if (recursiveRm.test(cmd) || forcePush.test(cmd) || /DROP\s+TABLE/i.test(cmd)) {
    block('destructive command blocked.');
  }
}

// 3. Green-retry cap (read counter the Orchestrator maintains)
const WM_PATH = path.join(MEM_DIR, 'working-memory.json');
try {
  const wm = JSON.parse(fs.readFileSync(WM_PATH, 'utf8'));
  if ((wm.stage1?.greenRetries ?? 0) > 3) {
    block('green-retry cap hit — escalate to human, do not loop.');
  }
} catch (err) {
  // Working memory may not exist yet — allow
}

process.exit(0);
