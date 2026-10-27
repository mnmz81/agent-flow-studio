---
name: coverage-gap-deviation-flagging
description: Before opening the PR, read coverage, cross-check every AC and SRS edge case against tests, and log structured SRS deviations. Use at the end of Stage 1 and whenever the code must differ from the SRS.
---

# Coverage gaps and SRS deviations

## 1. Coverage

Run `npx jest --coverage --coverageReporters=json-summary --coverageReporters=text-summary`.
- Read `coverage/coverage-summary.json` → `total.lines.pct`. This number is `coveragePercent` in the DONE signal.
- Below `projectMeta.coverageThreshold` (LTM): add tests for the uncovered branches in files this feature changed, starting with error paths.
- Coverage is a floor, not the goal: 100% lines with an untested AC is still a gap.

## 2. AC and edge-case cross-check

Build the traceability table (see ac-to-failing-test) and check:
- every AC has ≥ 1 passing test;
- every uxFlow state (loading, error, empty) has a test;
- every risk mitigation that names an AC has that AC tested.

A missing row is a gap: write the test now. Do not open the PR with a known gap.

## 3. SRS deviations

When the code must differ from the locked SRS, log it **before** continuing, and never edit the SRS:

```json
{ "type": "SRS_DEVIATION", "criterionId": "AC-07", "reason": "Email provider API returns 202, not 204; behavior unchanged", "impact": "LOW" }
```

- `impact`: `LOW` (no visible change), `MED` (visible but within scope), `HIGH` (changes scope or a risk mitigation).
- `HIGH` → stop and return `ESCALATE`: the human decides.
- All deviations go into `srsDeviations` in the DONE signal and into the PR description.
