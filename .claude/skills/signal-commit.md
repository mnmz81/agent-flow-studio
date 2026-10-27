---
name: signal-commit
description: "Write an agent's verdict/signal to working-memory.json after the agent returns. Only the Orchestrator calls this — uses scripts/update-working-memory.js."
status: not-implemented
trigger: After any sub-agent completes and returns its signal
---

# Signal Commit

## Purpose

After a sub-agent completes and returns its signal JSON, the Orchestrator parses the signal and writes the corresponding control-plane update to `working-memory.json`.

## Input

- Agent's final message (contains signal JSON)
- Current `working-memory.json` state

## Output

Updated `working-memory.json` with the agent's verdict, status, and metadata.

## Signal → Memory Mapping

| Signal | Memory Update |
|--------|--------------|
| `SRS_READY` | `phase0.status = "SRS_READY"`, `srsPath = signal.srsPath`, `riskTags = signal.riskTags` |
| `DONE` (Stage 1) | `stage1.status = "DONE"`, `stage1.verdict`, `stage1.prUrl`, `stage1.coveragePercent` |
| `DONE` (Stage 2) | `stage2.aiReview = signal.verdict` |
| `DONE` (Stage 3A) | `stage3.status = "READY"` |
| `DONE` (Stage 3B) | `stage3.status = "DONE"`, `stage3.verdict`, `stage3.rolloutPercent` |

## Mechanism

Uses `node scripts/update-working-memory.js '{...}'` via Bash — bypasses the pre-tool-gate's Write/Edit block on `.claude/memory/`.

## Current State

**NOT YET IMPLEMENTED** — the Orchestrator will use this pattern once agents are dispatched.
