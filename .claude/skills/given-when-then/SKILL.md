---
name: given-when-then
description: Write acceptance criteria as machine-testable Given/When/Then. Use for the SRS acceptanceCriteria section, and to reject or rewrite subjective criteria.
---

# Given / When / Then acceptance criteria

Every AC must be something a Jest or Playwright test can assert without human judgment.

## Format

```markdown
### AC-03 — Invalid email blocks submit  (story: US-01, confidence: HIGH)
- **Given** the sign-up form is open and the email field contains "abc"
- **When** the user moves focus out of the email field
- **Then** the text "Enter a valid email" is shown under the field
- **And** the "Create account" button is disabled
```

- IDs: `AC-01`, `AC-02`, … stable once written; never renumber.
- Each AC names the story it serves (`story: US-xx`) and a `confidence: HIGH | MED | LOW`.
- One behavior per AC. Two `When`s means two ACs.

## Rules for each clause

| Clause | Must contain | Reject |
|---|---|---|
| Given | concrete starting state: route, data, user role, feature-flag value | "the user is on the page" without saying which page |
| When | one user action or system event | "the user uses the feature" |
| Then | an observable outcome: visible text, element state, URL, HTTP call, stored value, emitted event | "works", "is fast", "is intuitive", "feels smooth" |

## Turning subjective into testable

| Subjective | Testable |
|---|---|
| "loads fast" | "Then the list renders within 1000 ms of navigation (Playwright timing)" |
| "clear error" | "Then the message 'Payment failed — try another card' is shown with role=alert" |
| "works on mobile" | "Given a 375×667 viewport … Then no horizontal scroll bar appears" |

If a criterion cannot be made testable, it is a product question: move it to `openQuestions`.

## Coverage checklist

For every story, write ACs for: the happy path, each validation error, the empty state, the loading state, the server-error state, and permission denied (if roles exist).
