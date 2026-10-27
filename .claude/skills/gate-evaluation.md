---
name: gate-evaluation
description: "Evaluate gate conditions by checking signals in working-memory, GitHub Actions check conclusions, and human approval state. Returns PASS / FAIL / CONDITIONAL."
status: not-implemented
trigger: Between stages, when Orchestrator needs to decide whether to proceed
---

# Gate Evaluation

## Purpose

Check whether preconditions are met to advance from one stage to the next. The Orchestrator calls this before dispatching the next agent.

## Gates

| Gate | Between | Conditions |
|------|---------|------------|
| Gate 0-1 (Auto QA) | SRS Agent → Human Review | Schema valid, every AC ↔ requirement ↔ flow traced |
| Gate 0-2 (Human) | Human Review → Phase 1 | Human approval recorded in working-memory |
| Gate 1-Review | Stage 1 → Stage 2 | CI green (GitHub Actions) AND Implementation DONE signal |
| Gate 1-Human | Stage 2 → Stage 3 | Forced when `risk:high` in riskTags — human must approve |
| Gate 1-GoNoGo | Stage 3A → Stage 3B | Explicit human authorization for production traffic |
| Gate 1-Health | Rollout steps | Pipeline reports HEALTHY at each percentage step |

## Input

- `working-memory.json` — current stage signals
- GitHub Actions check-run conclusions (via `gh api`)
- Human approval state

## Output

```json
{
  "gate": "gate-1-review",
  "verdict": "PASS",
  "details": { "ci": "GREEN", "implementationVerdict": "PASS" }
}
```

Verdict values: `PASS` | `FAIL` | `CONDITIONAL` (needs human input)

## Current State

**NOT YET IMPLEMENTED** — gate logic will be built when the full pipeline flow is implemented.
