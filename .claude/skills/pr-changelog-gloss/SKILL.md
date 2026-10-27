---
name: pr-changelog-gloss
description: Write the PR description (what shipped, why, AC traceability, deviations, review summary) and the CHANGELOG entry in Keep a Changelog format. Use at the end of every Stage 2 review.
---

# PR description + CHANGELOG

## PR description (`gh pr edit <n> --body "..."`)

```markdown
## What
Password reset by email (feat-012). SRS: docs/srs/feat-012.md

## Why
<one or two sentences from featureOverview.goals>

## Acceptance criteria
| AC | test | status |
|---|---|---|
| AC-01 | reset-request-form.component.spec.ts › AC-01 | ✅ |

## Deviations from the SRS
- AC-07 (LOW): provider returns 202, not 204; behavior unchanged. Reviewed: accepted.
(or "None")

## Review
Verdict: APPROVED · 0 MUST_FIX · 2 SHOULD_FIX · 1 NIT
Risk tags: risk:high (auth) — human checkpoint required before deploy.
```

Keep the Stage 1 traceability table; add your verdict per deviation. No API reference: Compodoc in CI generates it.

## CHANGELOG.md

Keep a Changelog format, newest on top, under `## [Unreleased]`:

```markdown
## [Unreleased]
### Added
- Password reset by email, link valid 30 minutes (#42)
### Fixed
- …
```

- Sections: Added, Changed, Deprecated, Removed, Fixed, Security. Auth or permission changes also get a Security line.
- Write for users of the app, not for developers: what changed for them.
- Create the file with a `# Changelog` heading if it does not exist.
- Commit on the PR branch: `git add CHANGELOG.md && git commit -m "docs: changelog for #<n>" && git push`.
