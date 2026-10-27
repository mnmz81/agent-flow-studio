---
name: pre-deploy-checklist
description: Run the DevOps Phase A checklist — CI, env/secrets, migration safety, rollback, feature flag — and return READY or BLOCKED with specific blockers. Use for every Phase A; it never deploys.
---

# Pre-deploy checklist (Phase A)

Each item is `PASS` or `FAIL` with evidence. Any `FAIL` → verdict `BLOCKED`.

| # | Item | How to check | PASS when |
|---|---|---|---|
| 1 | **CI** | github-actions-reader | all required checks green |
| 2 | **Env** | list what the diff reads (`environment.*.ts`, `process.env`, workflow `secrets.`/`vars.`), then `gh secret list` / `gh variable list` | every name the code needs exists; never print values |
| 3 | **Migrations** | see below | none, or all safe |
| 4 | **Rollback** | rollout-config-authoring wrote `.github/workflows/rollback.yml` | the workflow exists, and its trigger and target are correct |
| 5 | **Feature flag** | `.github/rollout-config.json` | the flag exists with `initialPercent: 0` |

## Migration safety

In the diff, find migration files and any SQL/schema change. For each:
- **Destructive** (DROP, column or table removal, type narrowing, NOT NULL without default, data deletion) → `FAIL` unless the PR or SRS records a tested backup **and** a down migration.
- **Long-locking** (index on a large table without CONCURRENTLY, full-table rewrite) → `FAIL` with the reason.
- **Expand/contract**: new code must work with both the old and new schema during the rollout; if it does not → `FAIL`.
- Tested in staging: a staging run or note in the PR proves it; otherwise `FAIL`.

## Output

```json
{ "signal": "DONE", "phase": "A", "verdict": "BLOCKED",
  "checklist": { "ci": "PASS", "env": "FAIL", "migrations": "PASS", "rollback": "PASS", "featureFlag": "PASS" },
  "blockers": ["env: secret RESET_EMAIL_API_KEY missing in production environment"] }
```

`blockers` names exactly what a human must do. After READY or BLOCKED, **stop**: no merge, no workflow run. The human go/no-go comes next.
