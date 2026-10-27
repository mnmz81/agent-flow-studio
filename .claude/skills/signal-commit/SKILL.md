---
name: signal-commit
description: "Orchestrator only. After a sub-agent returns, parse its signal JSON and write the matching control-plane update to working-memory.json with scripts/update-working-memory.js."
---

# Signal commit

The Orchestrator is the only writer of `.claude/memory/working-memory.json`. File tools are blocked on it; use the script:

```bash
node scripts/update-working-memory.js '<json patch>'
```

The patch is deep-merged; arrays are replaced, so pass full arrays.

## 1. Parse

Take the last fenced JSON block in the agent's final message. If it is missing or invalid, do not guess: re-ask the agent once for the signal, then escalate.

## 2. Map

| Signal | Patch |
|---|---|
| feature brief received | `{"featureId":"feat-012","phase":"phase0","featureKeywords":["auth","email","forms"],"phase0":{"status":"IN_PROGRESS"}}` |
| `SRS_READY` | `{"phase0":{"status":"SRS_READY"},"srsPath":"<srsPath>","riskTags":<riskTags>}` |
| SRS approved (Gate 0-2) | `{"phase0":{"status":"LOCKED"},"phase":"phase1","currentStage":"stage1"}` |
| `DONE` Stage 1 | `{"stage1":{"status":"DONE","verdict":"<verdict>","prUrl":"<prUrl>","coveragePercent":<n>,"greenRetries":<n>,"srsDeviations":<array>}}` |
| `DONE` Stage 2 | `{"stage2":{"aiReview":"<verdict>"},"currentStage":"stage2"}` |
| CI result | `{"stage2":{"ci":"GREEN"}}` or `"RED"` |
| `DONE` Phase A | `{"stage3":{"status":"READY","verdict":"<READY|BLOCKED>"},"currentStage":"stage3"}` |
| human "go" (Gate 1-GoNoGo) | `{"stage3":{"goNoGo":"APPROVED"}}` |
| `DONE` Phase B | `{"stage3":{"status":"DONE","verdict":"<HEALTHY|DEGRADED>","rolloutPercent":<n>}}` |

`featureKeywords` drive the LTM slice each agent receives (see ltm-slice-retrieval): set them from the brief's domain words before dispatching the SRS Agent.

## 3. Check

The script prints the merged state. Confirm the changed fields, then run gate-evaluation for the next gate.
