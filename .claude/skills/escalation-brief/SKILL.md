---
name: escalation-brief
description: "Orchestrator only. Write a short, actionable brief for the developer when the pipeline cannot continue — green-retry cap hit, a gate fails twice, a review loop, a missing signal, or a degraded rollout — then stop and wait."
---

# Escalation brief

## When

| Trigger | Source |
|---|---|
| Green-retry cap | Implementation verdict `ESCALATE`, or `stage1.greenRetries > 3` |
| Gate failed twice | gate-evaluation returned FAIL for the same gate twice |
| Review loop | `CHANGES_REQUESTED` twice for the same PR |
| HIGH deviation | an `SRS_DEVIATION` with `impact: HIGH` |
| Missing or invalid signal | after one re-ask |
| Degraded rollout | Phase B verdict `DEGRADED` |

## Brief (in chat, to the developer)

```markdown
**Pipeline stopped: <trigger> — <feature id>, <stage>**

**What failed:** <AC id / gate / finding, exact>
**Where:** <file:line>, <PR or run link>, SRS <path>
**What the agent tried:** <1–3 bullets, bounded attempts>
**Agent's hypothesis:** <one or two sentences, marked as a guess>
**Options:**
1. <recommended action> (recommended)
2. <alternative, e.g. relax the AC → needs an SRS change>
3. Stop the feature
```

## Rules

- One brief per stop, no more than ~15 lines; link to artifacts instead of pasting them.
- Record the stop: `node scripts/update-working-memory.js '{"currentStage":"ESCALATED"}'`.
- Then **stop**. Do not re-dispatch, retry or pick an option until the developer answers in chat.
- A degraded rollout links the incident issue from incident-alert-formatting.
