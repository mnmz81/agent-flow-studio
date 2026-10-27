---
name: srs-correctness-review
description: Review a PR against its locked SRS — every AC implemented and tested, deviations judged (not just listed), scope respected. Use first in every Stage 2 review.
---

# SRS correctness review

Inputs: the locked SRS (`srsPath`), `gh pr diff <n>`, the PR description (traceability table, deviations), Stage 1 signals.

## Steps

1. **AC coverage.** For each AC in the SRS, find (a) the code that implements it and (b) the test named with its id (`grep -rn "AC-07" src e2e`). Record one row per AC:

   | AC | code | test | verdict |
   |---|---|---|---|
   | AC-07 | auth.service.ts:42 | auth.service.spec.ts › AC-07 | OK |

   Missing test → `MUST_FIX`. Test exists but asserts something weaker than the Then → `MUST_FIX`.

2. **States.** Every uxFlow state (loading, error, empty) is rendered and tested. Missing → `MUST_FIX`.

3. **Deviations — judge each one.**
   - Is the reason true (check the code)?
   - Is the `impact` honest? A visible behavior change marked `LOW` → `MUST_FIX` (relabel and justify).
   - Does it break a risk mitigation or an ADR? → `MUST_FIX` and recommend escalation.
   - Undeclared deviation (code differs from the SRS, nothing logged) → `MUST_FIX`.

4. **Scope.** Code for an item in scopeBoundary **Out**, or features not in the SRS → `SHOULD_FIX` (remove) or `MUST_FIX` if it adds risk.

5. **Risk mitigations.** Each mitigation that names an AC is enforced in code, not only in a test double.

## Output

Findings with file, line, severity (`MUST_FIX` | `SHOULD_FIX` | `NIT`) and one-line message. Any `MUST_FIX` → verdict `CHANGES_REQUESTED`.
