---
name: ltm-slice-retrieval
description: "Extract only the relevant slice of long-term-memory.json for the current feature type — matching patterns, applicable ADRs, conventions. Keeps agent context small as LTM grows."
status: implemented
trigger: SessionStart + new feature brief
---

# LTM Slice Retrieval

## Purpose

Extract a compact, relevant subset of `long-term-memory.json` for injection into an agent's context. As LTM grows with patterns, ADRs, and conventions, agents should receive only what's relevant to their current feature — not the entire file.

## Input

- Feature brief (description, domain keywords)
- Full `.claude/memory/long-term-memory.json`

## Output

A compact context block containing only:
- Patterns whose `trigger` matches the feature domain
- ADRs relevant to the feature's technical area
- Applicable conventions

## Current State

Implemented in `.claude/hooks/session-start.js` (SessionStart for the Orchestrator, SubagentStart for the 4 agents); tested by `scripts/test-hooks.sh`.

- An ADR/pattern is kept when its `agents` (if set) include the receiving agent, and its `tags` (if set) meet `featureKeywords` in working memory.
- No `featureKeywords` (no feature in flight): tagged items are kept, not hidden.
- `projectMeta` and `conventions` always go in.
- The Orchestrator sets `featureKeywords` from the feature brief: `node scripts/update-working-memory.js '{"featureKeywords":["forms","auth"]}'`.
