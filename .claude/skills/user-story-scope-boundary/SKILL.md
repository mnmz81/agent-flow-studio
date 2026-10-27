---
name: user-story-scope-boundary
description: Write user stories and a hard binary in/out scope boundary for v1, and detect briefs that hide several features. Use for the SRS userStories, featureOverview and scopeBoundary sections.
---

# User stories + scope boundary

## User stories

```markdown
| id | role | want | soThat |
|---|---|---|---|
| US-01 | registered customer | to reset my password by email | I can get back into my account without support |
```

- `role` is a real user type from the brief, never "user" when the brief names roles.
- `soThat` is the user's benefit, not a restatement of `want`.
- Each story gets at least one AC (see given-when-then). A story with no AC is cut or moved to `out`.

## Scope boundary — binary

```markdown
### In (v1)
- Password reset via emailed link, link valid 30 minutes
### Out
- SMS reset — separate feature
- Admin-initiated reset — separate feature
```

- Every item is **In** or **Out**. Words like "maybe", "stretch", "if time allows", "nice to have", "phase 2 (tentative)" are forbidden: decide, or move the decision to `openQuestions` as a product question.
- Each **Out** item gives a one-phrase reason.
- `featureOverview.nonGoals` repeats the most important **Out** items.

## Detecting more than one feature

Flag the brief as several features when any of these hold:
- Stories serve unrelated roles with no shared screen or data.
- It needs two new routes that do not link to each other.
- It mixes a user-facing change with an unrelated refactor or migration.
- The AC count passes ~15.

Then: keep the core feature **In**, list the others under **Out** with "separate feature", and add an open question asking which to build first.
