---
name: wcag-accessibility-requirements
description: Write concrete WCAG 2.1 AA requirements per UI element (contrast, keyboard, ARIA, focus, screen reader) for the SRS accessibilityReqs section. Never "be accessible".
---

# Accessibility requirements (WCAG 2.1 AA)

Write one row per interactive or informative element in the componentMap. Each row must be testable (axe-core, Playwright keyboard steps, or Testing Library role queries).

```markdown
| element | requirement | WCAG | test |
|---|---|---|---|
| email field | Visible <label> "Email"; error linked with aria-describedby | 1.3.1, 3.3.1 | getByLabelText('Email'); error has id referenced by aria-describedby |
| "Send link" button | Reachable with Tab; Enter/Space activate; aria-busy="true" while loading | 2.1.1, 4.1.2 | keyboard-only Playwright run |
| error message | role="alert" so it is announced once | 4.1.3 | getByRole('alert') |
| page | Focus moves to the success heading after submit | 2.4.3 | expect heading toBeFocused() |
| text and icons | Contrast ≥ 4.5:1 text, ≥ 3:1 large text and UI parts | 1.4.3, 1.4.11 | axe-core color-contrast rule |
```

## Always cover

- **Keyboard**: every action reachable and operable without a mouse; visible focus ring; no keyboard trap; logical tab order.
- **Names**: every control has an accessible name; icon-only buttons have aria-label.
- **Status changes**: loading, success and error are announced (role=status / role=alert, aria-live).
- **Dialogs**: focus moves in on open, is trapped, Escape closes, focus returns to the trigger.
- **Motion**: honor prefers-reduced-motion for any animation.
- **Zoom**: usable at 200% zoom and 320 px width without horizontal scroll (1.4.10).

Reject vague wording: "accessible", "screen-reader friendly", "good contrast" without a ratio.
