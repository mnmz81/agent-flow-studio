---
name: ux-flow-component-reuse
description: Model each screen as a state machine (idle/loading/success/error/empty) and map every screen to Storybook components as reuse, extend or create. Use for the SRS uxFlows and componentMap sections.
---

# UX flows + component map

## UX flow as a state machine

```markdown
#### Screen: Reset password request (/reset)
| state | shown | transitions |
|---|---|---|
| idle | email field, "Send link" | submit valid email → loading; submit invalid → idle + inline error (AC-03) |
| loading | button spinner, field disabled | 2xx → success; 4xx/5xx → error; timeout 10 s → error |
| success | "Check your inbox" message | "Resend" after 60 s → loading |
| error | role=alert message + retry | retry → loading |
```

- Every screen lists at least idle, loading, success and error. Add `empty` for any list or search.
- Every transition names its trigger (user action, HTTP result, timer). Link it to an AC id where one exists.
- A state with no way out is a bug in the flow: fix it.

## Component map: reuse → extend → create

First find what exists: `Glob src/**/*.stories.ts` and read the story titles.

```markdown
| screen | component | decision | story |
|---|---|---|---|
| /reset | app-text-field | reuse | Forms/TextField/Default |
| /reset | app-button | extend: add `loading` input | Forms/Button/Loading (new variant) |
| /reset | app-reset-request-form | create | Auth/ResetRequestForm/Default |
```

- Prefer **reuse**. Choose **extend** when an existing component needs one more input or variant. Choose **create** only when no component is close; say why.
- Every extended or new component proposes its story name(s), including loading/error/empty variants.
