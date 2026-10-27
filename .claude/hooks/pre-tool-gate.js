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
  let real = abs;
  try {
    real = path.join(fs.realpathSync(dir), path.relative(dir, abs));
  } catch {}
  return real.toLowerCase(); // compare case-insensitively: on APFS/NTFS .Claude/ is .claude/
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

// 1b. Per-agent Hard Rules. Paths are repo-relative; a trailing '/' means "anything under".
// shortcut: Bash writes are not path-scoped (a denylist can't parse them); allowlists are tracked in issue #4.
const WRITE_SCOPES = {
  'srs-agent': ['docs/srs/'],
  'implementation-agent': ['src/', 'e2e/'],
  'ai-review-agent': ['CHANGELOG.md'],
  'devops-agent': ['.github/'],
};
const NO_BASH = ['ai-review-agent'];

const agentType = input.agent_type;
if (isSubAgent && tool === 'Bash' && NO_BASH.includes(agentType)) {
  block(`${agentType} may not run Bash (CI already ran the checks).`);
}
if (isSubAgent && ['Write', 'Edit', 'MultiEdit', 'NotebookEdit'].includes(tool) && filePath) {
  const target = realResolve(filePath);
  const rel = path.relative(realResolve(path.join(__dirname, '..', '..')), target);
  const under = (scopes) =>
    scopes.map((s) => s.toLowerCase()).some((s) => (s.endsWith('/') ? rel.startsWith(s) : rel === s));
  // No agent edits any harness (prompts, hooks, settings), in this repo or outside it (e.g. ~/.claude)
  if (target.split(path.sep).includes('.claude') || path.basename(target) === 'claude.md') {
    block('agents may not modify the harness (prompts, hooks, settings).');
  }
  const scopes = WRITE_SCOPES[agentType];
  if (scopes && !under(scopes)) block(`${agentType} may only write to: ${scopes.join(', ')}`);
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
