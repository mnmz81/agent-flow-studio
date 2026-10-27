---
name: incident-alert-formatting
description: When a rollout is DEGRADED, open a structured GitHub incident Issue — affected feature, metric deltas, rollback status, PR link, timeline, next actions. Use right after post-deploy-health-check reports DEGRADED.
---

# Incident alert

Create it with one command, body as a single quoted argument:

```bash
gh issue create --title "Incident: <feature> degraded at <percent>% — rolled back" --label incident --body "..."
```

(If the `incident` label does not exist, create the issue without `--label` and say so.)

## Body template

```markdown
## Summary
<feature> (PR #<n>) breached <metric> at <percent>% rollout. Auto-rollback: <done / NOT done>.

## Impact
- Users exposed: ~<percent>% for <minutes> min
- Error rate: <baseline> → <peak> (Δ <delta> pp, threshold <t>)
- P95 latency: <baseline> ms → <peak> ms (threshold <t>)
- Smoke tests: <passed>/<total>

## Status
- Flag `<flag>` now at <0>% (rollback run: <link>)
- Deploy reverted: <yes / no / not needed>

## Timeline (UTC)
- hh:mm go/no-go approved
- hh:mm 5% — healthy
- hh:mm 25% — <metric> over threshold
- hh:mm rollback finished

## Next actions
- [ ] Owner investigates <suspected area from the failing logs>
- [ ] Decide: fix forward or close the feature
- [ ] Retrospective input: <one line>
```

## Rules

- Facts only, from the workflow runs and logs; mark guesses as "suspected".
- Never include secret values, tokens or user personal data from logs.
- If rollback is **not** confirmed, put that first in the title: `ROLLBACK NOT CONFIRMED`.
- Put the issue URL in the Phase B signal.
