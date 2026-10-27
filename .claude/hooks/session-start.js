#!/usr/bin/env node
// SessionStart (Orchestrator) and SubagentStart (each agent): inject the relevant LTM slice.
// An ADR/pattern is kept when its `agents` (if any) include the receiving agent and its
// `tags` (if any) meet the feature's `featureKeywords` in working memory. projectMeta and
// conventions always go in. The Orchestrator sees every agent's items.
const fs = require('fs');
const path = require('path');

const MEM_DIR = path.join(__dirname, '..', 'memory');
const LTM_PATH = process.env.LTM_PATH ?? path.join(MEM_DIR, 'long-term-memory.json');
const WM_PATH = process.env.WM_PATH ?? path.join(MEM_DIR, 'working-memory.json');

function readJson(p, fallback) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
}

let input = {};
try {
  input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
} catch {
  // No or bad stdin: treat as Orchestrator SessionStart
}
const event = input.hook_event_name === 'SubagentStart' ? 'SubagentStart' : 'SessionStart';
const agent = event === 'SubagentStart' ? input.agent_type : null;

try {
  const ltm = JSON.parse(fs.readFileSync(LTM_PATH, 'utf8'));
  const keywords = (readJson(WM_PATH, {}).featureKeywords ?? []).map((k) => k.toLowerCase());

  const relevant = (item) =>
    (!agent || !item.agents || item.agents.includes(agent)) &&
    (!keywords.length || !item.tags || item.tags.some((t) => keywords.includes(t.toLowerCase())));

  const slice = {
    projectMeta: ltm.projectMeta,
    conventions: ltm.conventions,
    adrs: (ltm.adrs ?? []).filter(relevant),
    patterns: (ltm.patterns ?? []).filter(relevant),
  };
  const context = [
    `## Long-term Memory (project knowledge${agent ? ` for ${agent}` : ''})`,
    '',
    '```json',
    JSON.stringify(slice, null, 2),
    '```'
  ].join('\n');
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: event, additionalContext: context }
  }));
} catch (err) {
  process.stderr.write(`[session-start] LTM not found or unreadable: ${err.message}\n`);
}
process.exit(0);
