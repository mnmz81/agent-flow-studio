---
name: rollout-config-authoring
description: Write the feature-flag rollout config (0 → 5 → 25 → 100 with health thresholds) and the rollout/rollback GitHub Actions workflows under .github/. Use in Phase A; the pipeline, not the agent, shapes traffic.
---

# Rollout config + workflows

The agent writes configuration; GitHub Actions runs the ramp and the auto-rollback. The agent never shifts traffic step by step in a token loop.

## `.github/rollout-config.json`

```json
{
  "feature": "feat-012-password-reset",
  "flag": "password_reset_v1",
  "initialPercent": 0,
  "steps": [5, 25, 100],
  "soakMinutes": 15,
  "thresholds": {
    "errorRateDeltaPct": 0.5,
    "p95LatencyMs": { "max": 400, "maxIncreasePct": 20 },
    "smokeTests": "all-pass"
  },
  "baselineWindowMinutes": 30
}
```

- Thresholds come from the LTM baselines in context; if none exist, use the values above and say so in the checklist.
- `initialPercent` is always 0: deploy dark first.

## `.github/workflows/rollout.yml` (outline)

- `on: workflow_dispatch` with an input `feature`.
- Job per step: set flag percent → wait `soakMinutes` → run the health check (smoke suite + metrics query) → compare with thresholds.
- On breach: call the rollback workflow and fail the job, so the run shows the breach.
- Uses `environment: production`, so GitHub's own required reviewers also apply.

## `.github/workflows/rollback.yml`

- `on: workflow_dispatch` and `workflow_call`.
- Sets the flag to 0%, then reverts the deploy if the flag alone cannot stop the change.
- Writes a job summary: feature, percent at rollback, metric that breached.

## Rules

- Write only under `.github/`. Commit on the PR branch.
- Never put secret values in these files; reference `${{ secrets.NAME }}`.
- Starting the rollout (`gh workflow run rollout.yml`) is blocked until the human go/no-go is recorded.
