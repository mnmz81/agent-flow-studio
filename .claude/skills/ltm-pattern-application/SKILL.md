---
name: ltm-pattern-application
description: Apply the long-term-memory slice in your context proactively while writing an SRS — learned patterns, ADRs and conventions turn into stories, ACs, risks or constraints without being asked.
---

# Applying long-term memory

Your starting context holds a `## Long-term Memory (project knowledge for <agent>)` block: projectMeta, conventions, and the ADRs and patterns that apply to you and to this feature.

## Before writing

Read the block and list, for yourself, every item that could affect this feature.

## While writing

| LTM item | What to do |
|---|---|
| **pattern** (`trigger` → `finding` → `action`) whose trigger matches the brief | Do the action: add the missing story, AC or risk. Example: pattern "auth features miss session expiry" → add an AC for an expired session. |
| **ADR** | Treat as a constraint. Never write an AC or scope item that contradicts it. If the brief requires breaking it, add an open question naming the ADR id. |
| **convention** | Use it in names and component decisions (e.g. kebab-case component names, signals for state). |
| **projectMeta** (`coverageThreshold`, stack) | Respect it in success metrics and ACs. |

## Record it

Mark each AC, story or risk that came from LTM with its source: `(from PAT-012)` or `(ADR-004)`. The retrospective uses these marks to check whether a pattern helped.

Never edit long-term memory yourself: only the Orchestrator writes it.
