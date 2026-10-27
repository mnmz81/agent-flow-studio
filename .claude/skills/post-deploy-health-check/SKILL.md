---
name: post-deploy-health-check
description: In Phase B, read each rollout step's result — smoke tests, error-rate delta, P95 vs baseline — confirm the pipeline's HEALTHY or auto-rollback outcome, and report the final verdict. Use after the human go, during and after the rollout workflow.
---

# Post-deploy health check (Phase B)

Precondition: the human go is recorded (`stage3.goNoGo = "APPROVED"`) and the rollout workflow is running.

## Read each step

```bash
gh run list --workflow rollout.yml --limit 1 --json databaseId,status,conclusion
gh run view <run-id> --json jobs --jq '.jobs[] | {name, conclusion}'
gh run view <run-id> --log | grep -E 'step=|error_rate|p95|smoke'
```

For each step (0%, 5%, 25%, 100%) record:

| step | smoke | error-rate delta | P95 (ms) | within thresholds |
|---|---|---|---|---|
| 5% | 12/12 pass | +0.1 pp | 210 (base 190) | yes |

Thresholds are those in `.github/rollout-config.json`.

## Decide

| Pipeline result | Your check | Verdict |
|---|---|---|
| success at 100% | every step within thresholds | `HEALTHY` |
| success at 100% | a metric was over threshold but no rollback ran | `DEGRADED`: the pipeline missed a breach; trigger rollback is a human call, report it |
| rollback ran | confirm the flag is at 0% (rollback job summary) | `DEGRADED` |
| failed for another reason | read the failing job | `DEGRADED`, with the failing job named |

Never proceed past a breach and never re-run a rolled-back rollout yourself.

## Output

```json
{ "signal": "DONE", "phase": "B", "verdict": "HEALTHY", "rolloutPercent": 100, "finalErrorRate": 0.12, "finalP95Latency": 180 }
```

On `DEGRADED`, also run incident-alert-formatting.
