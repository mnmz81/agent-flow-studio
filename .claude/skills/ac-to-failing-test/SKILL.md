---
name: ac-to-failing-test
description: Turn one SRS acceptance criterion into the failing test that encodes it, before any production code exists, with AC → test traceability. Use at the start of every TDD cycle.
---

# AC → failing test

## Pick the test level

| The AC's Then is about… | Test |
|---|---|
| what one component shows or emits | component test (Jest + Angular Testing Library), see angular-testing |
| a service result, HTTP call, retry, mapping | service test with HttpTestingController |
| a flow across routes or real navigation | Playwright E2E, see playwright-e2e-patterns |

Pick the lowest level that can observe the Then.

## Map Given / When / Then

```ts
// AC-03: Invalid email blocks submit
it('AC-03 shows an error and disables submit for an invalid email', async () => {
  // Given
  await render(ResetRequestFormComponent);
  const email = screen.getByLabelText('Email');
  // When
  await userEvent.type(email, 'abc');
  await userEvent.tab();
  // Then
  expect(screen.getByText('Enter a valid email')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Send link' })).toBeDisabled();
});
```

- The test name and a `// AC-xx:` comment carry the AC id: this is the traceability link.
- Assert exactly what the Then says, through what the user sees (role, label, text), not private fields.

## Red for the right reason

Run only this spec: `npx jest path/to/file.spec.ts -t "AC-03"`.
- Good red: the assertion fails (element missing, wrong text).
- Bad red: compile error, missing import, bad selector typo. Fix the test until it fails on the assertion. Create an empty component/service stub if needed so the test compiles.

## Traceability table

Keep it in the PR description:

```markdown
| AC | test |
|---|---|
| AC-03 | src/app/auth/reset-request-form.component.spec.ts › AC-03 … |
```

An AC with no row is a gap: write its test before moving on.
