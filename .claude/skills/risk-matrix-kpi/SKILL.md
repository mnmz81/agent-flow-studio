---
name: risk-matrix-kpi
description: Build the SRS risk register (likelihood × impact with mitigations, at least 2 entries), the risk tags that drive routing, and measurable success metrics (baseline → target → measure-by).
---

# Risk register, risk tags, success metrics

## Risk register (minimum 2 entries)

```markdown
| id | risk | likelihood (1-3) | impact (1-3) | score | mitigation |
|---|---|---|---|---|---|
| R-01 | Reset link reused after password change | 2 | 3 | 6 | Token single-use, invalidated on change (AC-07) |
| R-02 | Email provider rate-limits bursts | 1 | 2 | 2 | Queue sends; show "check your inbox" regardless (AC-09) |
```

- score = likelihood × impact. Sort by score, highest first.
- Every mitigation is concrete and, where possible, points to the AC that enforces it.
- Always consider: security, data loss, performance, third-party failure, accessibility, migration/rollback.

## Risk tags (section riskTags)

Add `risk:high` when the feature touches any of: authentication or sessions, payments or money, database migrations, data deletion, permissions/roles, personal data (PII). `risk:high` forces the Gate 1-Human checkpoint, so do not omit it to save time.
Other tags as plain labels: `risk:perf`, `risk:a11y`, `risk:third-party`.

## Success metrics

```markdown
| metric | baseline | target | measure-by |
|---|---|---|---|
| Password-reset support tickets / week | 40 | ≤ 10 | Helpdesk tag count, 4 weeks after 100% rollout |
| Reset flow completion rate | n/a (new) | ≥ 80% | Analytics funnel reset_requested → reset_done |
```

- A metric without a baseline writes `n/a (new)` and says how the baseline will be captured.
- `measure-by` names the data source and the time window. "User satisfaction" alone is not a metric.
