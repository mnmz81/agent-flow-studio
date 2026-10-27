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
// Bash for these agents is limited by BASH_ALLOW below, which also forbids file redirection.
const WRITE_SCOPES = {
  'srs-agent': ['docs/srs/'],
  'implementation-agent': ['src/', 'e2e/'],
  'ai-review-agent': ['CHANGELOG.md'],
  'devops-agent': ['.github/'],
};

// 1c. Per-agent Bash allowlists: every command segment must start with one of these prefixes.
// No uniq: its second operand is an output file.
const READ_ONLY = ['git status', 'git log', 'git diff', 'git show', 'cat', 'ls', 'head', 'tail', 'grep', 'wc', 'sort', 'jq'];
const GIT_WRITE = ['git add', 'git commit', 'git push', 'git switch', 'git checkout -b'];
const NG = ['test', 'build', 'lint', 'generate'].flatMap((c) => [`ng ${c}`, `npx ng ${c}`]);
const BASH_ALLOW = {
  'srs-agent': [...READ_ONLY, 'gh issue list', 'gh issue view', 'gh pr list', 'gh pr view', 'gh search'],
  'implementation-agent': [...READ_ONLY, ...GIT_WRITE, ...NG, 'npm test', 'npm run test', 'npm run lint',
    'npm run build', 'npm run e2e', 'npm ci', 'npx jest', 'npx playwright test',
    'gh pr create', 'gh pr edit', 'gh pr view', 'gh pr checks'],
  'ai-review-agent': [...READ_ONLY, 'git add', 'git commit', 'git push',
    'gh pr view', 'gh pr diff', 'gh pr checks', 'gh pr review', 'gh pr comment', 'gh pr edit'],
  'devops-agent': [...READ_ONLY, ...GIT_WRITE, 'git pull', 'gh pr view', 'gh pr checks', 'gh pr merge',
    'gh run list', 'gh run view', 'gh run watch', 'gh workflow view', 'gh workflow run',
    'gh secret list', 'gh variable list', 'gh api', 'gh issue create'],
};
// Production traffic needs Gate 1-GoNoGo: the Orchestrator sets stage3.goNoGo = "APPROVED" only after the human says go
const NEEDS_GO = ['gh pr merge', 'gh workflow run'];
// gh api may only read: no non-GET method, no request fields/body
// gh api is read-only: GET is the default, so any method, field, body or header flag (attached or in a
// short-flag cluster like -iX) is refused, and so is graphql (mutations).
const GH_API_WRITE = /(?:^|\s)['"]?(?:-[a-zA-Z]*[fFXH]|--(?:field|raw-field|input|header|method))|^gh api\s+graphql\b/;
// Options that make an allowed command write a file (sort -o, git --output, jest --outputFile, …)
const WRITES_FILE = /\s--output(?:[-_]?(?:file|dir|directory))?(?:[\s=]|$)|^sort\b.*\s-[a-zA-Z]*o/i;

// Split on unquoted ; & | and newlines. Returns null when the command uses command or process
// substitution or a file redirection, which could hide another command or write outside the write scope.
function segments(command) {
  const s = command.replace(/\s\d?>&\d|\s\d?>\s*\/dev\/null/g, ' '); // 2>&1 and >/dev/null are fine
  const out = [];
  let cur = '';
  let quote = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote === "'") { if (c === "'") quote = null; cur += c; continue; }
    if (c === '\\') { cur += c + (s[i + 1] ?? ''); i++; continue; }
    if (c === '`' || (c === '$' && '({'.includes(s[i + 1]))) return null; // expands even inside "..."
    if (quote === '"') { if (c === '"') quote = null; cur += c; continue; }
    if (c === "'" || c === '"') { quote = c; cur += c; continue; }
    if (c === '<' || c === '>') return null;
    if (';&|\n'.includes(c)) { out.push(cur); cur = ''; continue; }
    cur += c;
  }
  out.push(cur);
  // Only harmless env prefixes are dropped; any other VAR=… (NODE_OPTIONS, GIT_*, PAGER) leaves the segment
  // unmatched by the allowlist, so it is refused.
  return out.map((x) => x.trim().replace(/^((?:CI|FORCE_COLOR|NO_COLOR)=\S*\s+)+/, '')).filter(Boolean);
}

const agentType = input.agent_type;
const WM_PATH = process.env.WM_PATH ?? path.join(MEM_DIR, 'working-memory.json');
let wm = {};
try {
  wm = JSON.parse(fs.readFileSync(WM_PATH, 'utf8'));
} catch {
  // Working memory may not exist yet
}

const allow = isSubAgent && tool === 'Bash' ? BASH_ALLOW[agentType] : null;
if (allow) {
  const segs = segments(cmd);
  if (!segs) block('use no $(...), ${...}, backticks or < > redirection; write files with the Write tool.');
  if (/\.claude|claude\.md/i.test(cmd)) block('agents may not touch the harness (.claude/, CLAUDE.md) from Bash.');
  const starts = (seg, prefixes) => prefixes.some((p) => seg === p || seg.startsWith(p + ' '));
  for (const seg of segs) {
    if (!starts(seg, allow)) block(`${agentType} may not run "${seg.slice(0, 60)}". Allowed: ${allow.join(', ')}`);
    if (starts(seg, NEEDS_GO) && wm.stage3?.goNoGo !== 'APPROVED') {
      block('production traffic needs the human go/no-go (stage3.goNoGo = APPROVED). Stop and emit READY.');
    }
    if (starts(seg, ['gh api']) && GH_API_WRITE.test(seg)) block('gh api is read-only for agents.');
    if (WRITES_FILE.test(seg)) block('no file-writing options in Bash; write files with the Write tool.');
  }
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
// shortcut: a denylist can't see through variables or eval; the 4 pipeline agents are covered by BASH_ALLOW.
if (tool === 'Bash') {
  const recursiveRm = /(?<![\w.\/-])(?<!git\s+)rm\s+(?:[^;&|]*\s)?(?:-[a-zA-Z]*[rR][a-zA-Z]*|--recursive)(?=[\s'"]|$)/;
  const forcePush = /\bgit\s+push\b[^;&|]*?\s(?:--force(?:-with-lease)?\b|-[a-zA-Z]*f[a-zA-Z]*(?=\s|$)|\+\S)/;
  if (recursiveRm.test(cmd) || forcePush.test(cmd) || /DROP\s+TABLE/i.test(cmd)) {
    block('destructive command blocked.');
  }
}

// 3. Green-retry cap (read counter the Orchestrator maintains)
if ((wm.stage1?.greenRetries ?? 0) > 3) {
  block('green-retry cap hit — escalate to human, do not loop.');
}

process.exit(0);
