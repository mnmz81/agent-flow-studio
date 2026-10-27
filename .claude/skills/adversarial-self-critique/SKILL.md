---
name: adversarial-self-critique
description: Re-read a finished SRS as a hostile reviewer and fix it in place — untestable ACs, contradictions, orphan requirements, unmapped screens. Use once after all 11 SRS sections are written, before emitting SRS_READY.
---

# Adversarial self-critique

You are now the reviewer who must reject this SRS if it is weak. Read the whole file top to bottom, then run every check. Fix each failure **in the file** (Edit), do not just list it.

## Checks

1. **Testable** — every AC has a concrete Given, one When, an observable Then (see given-when-then). Rewrite any that say fast/easy/intuitive/works.
2. **Traced** — every story has ≥ 1 AC; every AC names a story; every uxFlow transition that a user can trigger has an AC.
3. **Mapped** — every screen in uxFlows appears in componentMap; every new or extended component has a story name.
4. **States** — every screen has loading, error and (for lists) empty states, and each has an AC.
5. **Consistent** — no two sections disagree (e.g. scope says "no SMS" but an AC sends SMS; a timeout of 10 s in one place and 30 s in another).
6. **Scope** — scopeBoundary has only In/Out; no "maybe" or "stretch".
7. **Risks** — ≥ 2 risks, each with a concrete mitigation; riskTags include `risk:high` if auth, payments, migrations, deletion, roles or PII are touched.
8. **Metrics** — each has baseline, target and measure-by.
9. **A11y** — every interactive element has a concrete WCAG row.
10. **Open questions** — only product decisions you cannot make. Tech choices (library, state shape, endpoint names) are yours: decide them, or leave them to the Implementation Agent, and remove them from openQuestions.
11. **No implementation** — no code, file names or class designs beyond component names.

## Finish

Add a short `## Self-critique log` at the end: one line per fix ("AC-05 rewritten: 'fast' → '≤ 1000 ms'"). Then emit the SRS_READY signal.
