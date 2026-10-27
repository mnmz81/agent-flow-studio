#!/usr/bin/env node
// Gate 0-1 (Auto QA): validate an SRS file against the SRS Agent's schema and hard rules.
// Usage: node scripts/validate-srs.js docs/srs/feat-012.md
// Prints one line per error (and warning); exits 1 when there is any error.
const fs = require('fs');

const SECTIONS = ['featureOverview', 'userStories', 'acceptanceCriteria', 'riskRegister', 'successMetrics',
  'scopeBoundary', 'uxFlows', 'componentMap', 'accessibilityReqs', 'riskTags', 'openQuestions'];
const SUBJECTIVE = /\b(fast|quick(ly)?|easy|easily|intuitive|user-friendly|smooth(ly)?|seamless(ly)?|nice|properly|works)\b/i;
const NOT_BINARY = /\b(maybe|stretch|if time allows|nice[- ]to[- ]have|tentative|tbd)\b/i;
const HIGH_RISK = /\b(auth\w*|log ?in|password|session|payment\w*|billing|migration\w*|delet\w+|permission\w*|roles?|personal data|PII)\b/i;

// Split on "## " headings; a heading may be numbered ("## 3. acceptanceCriteria")
function sections(text) {
  const out = {};
  for (const part of text.split(/^## /m).slice(1)) {
    const [head, ...body] = part.split('\n');
    out[head.replace(/^\d+\.\s*/, '').trim().replace(/\s+/g, '').toLowerCase()] = body.join('\n');
  }
  return out;
}
const tableRows = (body) => body.split('\n').filter((l) => /^\|/.test(l) && !/^\|[\s:|-]+\|?$/.test(l)).slice(1);

function validateSrs(text) {
  const errors = [];
  const warnings = [];
  const sec = sections(text);
  const get = (name) => sec[name.toLowerCase()];

  for (const name of SECTIONS) if (get(name) === undefined) errors.push(`missing section "## ${name}"`);
  if (!/^## +Self-critique log/im.test(text)) errors.push('missing "## Self-critique log" (adversarial-self-critique)');

  const stories = new Set(tableRows(get('userStories') ?? '').map((r) => (r.match(/US-\d+/) || [])[0]).filter(Boolean));
  if (get('userStories') !== undefined && !stories.size) errors.push('userStories: no US-xx rows');

  const usedStories = new Set();
  const seen = new Set();
  for (const block of (get('acceptanceCriteria') ?? '').split(/^### /m).slice(1)) {
    const id = (block.match(/^(AC-\d+)/) || [])[1];
    if (!id) { errors.push(`acceptanceCriteria: heading "### ${block.split('\n')[0]}" does not start with AC-xx`); continue; }
    if (seen.has(id)) errors.push(`${id}: duplicate AC id`);
    seen.add(id);
    for (const kw of ['Given', 'When', 'Then']) {
      if (!new RegExp(`^\\s*[-*]?\\s*\\**${kw}\\b`, 'im').test(block)) errors.push(`${id}: no ${kw} line`);
    }
    const thenLines = block.split('\n').filter((l) => /^\s*[-*]?\s*\**(Then|And)\b/i.test(l));
    for (const l of thenLines) {
      const m = l.match(SUBJECTIVE);
      if (m) errors.push(`${id}: subjective outcome "${m[0]}" — make it observable (given-when-then)`);
    }
    const story = (block.match(/story:\s*(US-\d+)/) || [])[1];
    if (!story) errors.push(`${id}: no "story: US-xx"`);
    else if (!stories.has(story)) errors.push(`${id}: story ${story} is not in userStories`);
    else usedStories.add(story);
    if (!/confidence:\s*(HIGH|MED|LOW)\b/.test(block)) errors.push(`${id}: no "confidence: HIGH | MED | LOW"`);
  }
  if (get('acceptanceCriteria') !== undefined && !seen.size) errors.push('acceptanceCriteria: no "### AC-xx" criteria');
  for (const s of stories) if (!usedStories.has(s)) errors.push(`${s}: story has no acceptance criterion`);

  if (get('riskRegister') !== undefined && tableRows(get('riskRegister')).filter((r) => /R-\d+/.test(r)).length < 2) {
    errors.push('riskRegister: needs at least 2 R-xx rows');
  }
  if (get('successMetrics') !== undefined && !tableRows(get('successMetrics')).length) {
    errors.push('successMetrics: needs at least 1 metric row (baseline → target → measure-by)');
  }
  const scope = (get('scopeBoundary') ?? '').match(NOT_BINARY);
  if (scope) errors.push(`scopeBoundary: "${scope[0]}" — every item is In or Out`);

  const risky = text.replace(/^## riskTags[\s\S]*?(?=^## )/m, '').match(HIGH_RISK);
  if (risky && !/risk:high/.test(get('riskTags') ?? '')) {
    warnings.push(`riskTags: mentions "${risky[0]}" but has no risk:high — confirm it is not auth/payments/migration/deletion/roles/PII`);
  }
  return { errors, warnings };
}

// AC ids defined in the acceptanceCriteria section, in order
const acIds = (text) =>
  (sections(text).acceptancecriteria ?? '').split(/^### /m).slice(1).map((b) => (b.match(/^(AC-\d+)/) || [])[1]).filter(Boolean);

module.exports = { validateSrs, acIds };

if (require.main === module) {
  const file = process.argv[2];
  if (!file) { process.stderr.write('Usage: node scripts/validate-srs.js <srs.md>\n'); process.exit(2); }
  const { errors, warnings } = validateSrs(fs.readFileSync(file, 'utf8'));
  for (const e of errors) console.log(`ERROR  ${e}`);
  for (const w of warnings) console.log(`WARN   ${w}`);
  if (!errors.length) console.log(`OK  ${file}`);
  process.exit(errors.length ? 1 : 0);
}
