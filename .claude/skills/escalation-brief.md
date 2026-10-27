---
name: escalation-brief
description: "Format a structured human brief when a cap is hit, a gate blocks, or CHANGES_REQUESTED loops. Includes the failing item, artifact path, agent hypothesis, and recommended action."
status: not-implemented
trigger: Green-retry cap hit, gate FAIL, or repeated CHANGES_REQUESTED cycles
---

# Escalation Brief

## Purpose

When the automated pipeline cannot proceed — cap hit, gate failure, or review loop — format a clear, actionable brief for the human developer.

## Input

- Escalation type (cap hit / gate fail / review loop)
- Agent's last output (failing test, code, hypothesis)
- Relevant artifact paths (SRS, PR, test file)
- Working-memory state

## Output

A structured brief with:

1. **What failed** — exact item (AC id, gate name, finding)
2. **Where** — file path, line number, PR URL
3. **Agent's hypothesis** — why the agent thinks it failed
4. **What the agent tried** — bounded attempts summary
5. **Recommended action** — what the human should do next

## Escalation Types

| Type | Trigger | Key Info |
|------|---------|----------|
| Green-retry cap | `stage1.greenRetries > 3` | Failing test + code + 3 attempt summaries |
| Gate FAIL | Any gate returns FAIL | Which conditions failed, what's missing |
| Review loop | `CHANGES_REQUESTED` ≥ 2 cycles | Findings that keep recurring, suspected root cause |

## Current State

**NOT YET IMPLEMENTED** — will be built when the full pipeline flow handles escalation paths.
