---
name: ltm-slice-retrieval
description: "Extract only the relevant slice of long-term-memory.json for the current feature type — matching patterns, applicable ADRs, conventions. Keeps agent context small as LTM grows."
status: not-implemented
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

**NOT YET IMPLEMENTED** — the `session-start.js` hook currently injects the full LTM. This skill will provide the filtering logic when LTM grows beyond a trivial size.

## Future Implementation Notes

- Match pattern triggers against feature brief keywords
- Filter ADRs by tag/domain relevance
- Always include conventions (small, universally applicable)
- Output as markdown block for `additionalContext` injection
