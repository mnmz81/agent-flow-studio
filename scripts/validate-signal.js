#!/usr/bin/env node
// Validate a pipeline agent's completion signal: the last ```json block of its final message (or raw JSON).
// Usage: node scripts/validate-signal.js <agent-type> '<final message or signal JSON>'
// Used by .claude/hooks/stop-gate.js (SubagentStop) and by the Orchestrator's signal-commit step.
// Prints one line per error; exits 1 when there is any error.
const fs = require('fs');
const path = require('path');
const { validateSrs, acIds } = require('./validate-srs');

const ROOT = path.join(__dirname, '..');
const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return {}; } };

function extractSignal(text) {
  const blocks = [...String(text).matchAll(/```(?:json)?[ \t]*\n([\s\S]*?)```/g)].map((m) => m[1]);
  for (const c of (blocks.length ? blocks : [text]).reverse()) {
    try {
      const o = JSON.parse(c);
      if (o && typeof o === 'object' && 'signal' in o) return o;
    } catch {}
  }
  return null;
}

// *.spec.ts / *.spec.js under src/ and e2e/
function specFiles(root) {
  const out = [];
  const walk = (dir) => {
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name === 'node_modules') continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.spec\.[jt]s$/.test(e.name)) out.push(p);
    }
  };
  walk(path.join(root, 'src'));
  walk(path.join(root, 'e2e'));
  return out;
}

const oneOf = (v, xs) => xs.includes(v);
const isInt = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;

function validateSignal(agentType, text, { root = ROOT, wm = {}, ltm = {} } = {}) {
  const AGENTS = ['srs-agent', 'implementation-agent', 'ai-review-agent', 'devops-agent'];
  if (!AGENTS.includes(agentType)) return [];
  const s = extractSignal(text);
  if (!s) return ['no completion signal: end with a ```json block holding your Signal Format'];
  const errors = [];
  const need = (ok, msg) => { if (!ok) errors.push(msg); };

  if (agentType === 'srs-agent') {
    need(s.signal === 'SRS_READY', 'signal must be "SRS_READY"');
    need(Array.isArray(s.riskTags), 'riskTags must be an array');
    if (typeof s.srsPath !== 'string' || !/^docs\/srs\/feat-[\w-]+\.md$/.test(s.srsPath)) {
      errors.push('srsPath must look like docs/srs/feat-{id}.md');
    } else if (!fs.existsSync(path.join(root, s.srsPath))) {
      errors.push(`srsPath ${s.srsPath} does not exist`);
    } else {
      for (const e of validateSrs(fs.readFileSync(path.join(root, s.srsPath), 'utf8')).errors) errors.push(`SRS: ${e}`);
    }
  }

  if (agentType === 'implementation-agent') {
    need(s.signal === 'DONE', 'signal must be "DONE"');
    need(oneOf(s.verdict, ['PASS', 'ESCALATE']), 'verdict must be PASS or ESCALATE');
    need(isInt(s.greenRetries, 0, 3), 'greenRetries must be an integer 0-3');
    need(Array.isArray(s.srsDeviations), 'srsDeviations must be an array');
    for (const d of s.srsDeviations ?? []) {
      need(d && d.type === 'SRS_DEVIATION' && /^AC-\d+$/.test(d.criterionId) && typeof d.reason === 'string' &&
        oneOf(d.impact, ['LOW', 'MED', 'HIGH']), `bad deviation ${JSON.stringify(d)}: needs type, criterionId, reason, impact`);
      if (d?.impact === 'HIGH' && s.verdict === 'PASS') errors.push(`${d.criterionId}: a HIGH deviation needs verdict ESCALATE`);
    }
    if (s.verdict === 'PASS') {
      need(/^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+$/.test(s.prUrl ?? ''), 'PASS needs prUrl (https://github.com/{owner}/{repo}/pull/{n})');
      const threshold = ltm.projectMeta?.coverageThreshold ?? 80;
      need(typeof s.coveragePercent === 'number' && s.coveragePercent >= threshold,
        `coveragePercent must be a number >= ${threshold} (projectMeta.coverageThreshold)`);
      if (wm.srsPath && fs.existsSync(path.join(root, wm.srsPath))) {
        const specs = specFiles(root).map((f) => fs.readFileSync(f, 'utf8')).join('\n');
        for (const id of acIds(fs.readFileSync(path.join(root, wm.srsPath), 'utf8'))) {
          need(new RegExp(`\\b${id}\\b`).test(specs), `${id} has no test that names it (src/**/*.spec.ts or e2e/)`);
        }
      }
    }
  }

  if (agentType === 'ai-review-agent') {
    need(s.signal === 'DONE', 'signal must be "DONE"');
    need(oneOf(s.verdict, ['APPROVED', 'CHANGES_REQUESTED']), 'verdict must be APPROVED or CHANGES_REQUESTED');
    need(Array.isArray(s.findings), 'findings must be an array');
    for (const f of s.findings ?? []) {
      need(f && typeof f.file === 'string' && isInt(f.line, 1, 1e7) && oneOf(f.severity, ['MUST_FIX', 'SHOULD_FIX', 'NIT']) &&
        typeof f.message === 'string', `bad finding ${JSON.stringify(f)}: needs file, line, severity (MUST_FIX|SHOULD_FIX|NIT), message`);
    }
    const mustFix = (s.findings ?? []).some((f) => f?.severity === 'MUST_FIX');
    if (s.verdict === 'APPROVED' && mustFix) errors.push('APPROVED with a MUST_FIX finding: verdict must be CHANGES_REQUESTED');
    if (s.verdict === 'CHANGES_REQUESTED' && !mustFix) errors.push('CHANGES_REQUESTED needs at least one MUST_FIX finding');
    need(s.prGlossWritten === true, 'prGlossWritten must be true: write the PR description and CHANGELOG (pr-changelog-gloss)');
  }

  if (agentType === 'devops-agent') {
    need(s.signal === 'DONE', 'signal must be "DONE"');
    if (s.phase === 'A') {
      need(oneOf(s.verdict, ['READY', 'BLOCKED']), 'Phase A verdict must be READY or BLOCKED');
      const items = ['ci', 'env', 'migrations', 'rollback', 'featureFlag'];
      for (const k of items) need(oneOf(s.checklist?.[k], ['PASS', 'FAIL']), `checklist.${k} must be PASS or FAIL`);
      const allPass = items.every((k) => s.checklist?.[k] === 'PASS');
      if (s.verdict === 'READY' && !allPass) errors.push('READY needs every checklist item PASS');
      if (s.verdict === 'BLOCKED') need(Array.isArray(s.blockers) && s.blockers.length > 0, 'BLOCKED needs a non-empty blockers list');
    } else if (s.phase === 'B') {
      need(oneOf(s.verdict, ['HEALTHY', 'DEGRADED']), 'Phase B verdict must be HEALTHY or DEGRADED');
      need(typeof s.rolloutPercent === 'number' && s.rolloutPercent >= 0 && s.rolloutPercent <= 100, 'rolloutPercent must be 0-100');
      if (s.verdict === 'HEALTHY') need(s.rolloutPercent === 100, 'HEALTHY means the rollout reached 100%');
      if (s.verdict === 'DEGRADED') {
        need(/^https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/\d+$/.test(s.incidentUrl ?? ''), 'DEGRADED needs incidentUrl (incident-alert-formatting)');
      }
    } else {
      errors.push('phase must be "A" or "B"');
    }
  }
  return errors;
}

module.exports = { validateSignal, extractSignal };

if (require.main === module) {
  const [agentType, text] = process.argv.slice(2);
  if (!agentType || text === undefined) {
    process.stderr.write("Usage: node scripts/validate-signal.js <agent-type> '<final message or signal JSON>'\n");
    process.exit(2);
  }
  const mem = path.join(ROOT, '.claude', 'memory');
  const errors = validateSignal(agentType, text, {
    wm: readJson(path.join(mem, 'working-memory.json')),
    ltm: readJson(path.join(mem, 'long-term-memory.json')),
  });
  for (const e of errors) console.log(`ERROR  ${e}`);
  if (!errors.length) console.log('OK');
  process.exit(errors.length ? 1 : 0);
}
