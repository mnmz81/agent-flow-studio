---
name: angular-testing
description: Behavior tests for Angular components (Jest + Angular Testing Library + user-event) and services (HttpTestingController), including error and retry paths. Use for every unit or component test.
---

# Component and service tests

Test what the user sees and does, never private fields or internal method calls.

## Component

```ts
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

it('AC-05 shows the success message after a valid submit', async () => {
  const auth = { requestReset: jest.fn().mockReturnValue(of(void 0)) };
  await render(ResetRequestFormComponent, {
    providers: [{ provide: AuthService, useValue: auth }],
    inputs: { initialEmail: '' },
  });
  await userEvent.type(screen.getByLabelText('Email'), 'a@b.co');
  await userEvent.click(screen.getByRole('button', { name: 'Send link' }));
  expect(await screen.findByText('Check your inbox')).toBeInTheDocument();
  expect(auth.requestReset).toHaveBeenCalledWith({ email: 'a@b.co' });
});
```

- Query priority: `getByRole` → `getByLabelText` → `getByText` → `getByTestId` (last resort).
- Use `findBy…` for anything that appears after async work. Use `jest.useFakeTimers()` for debounce/timers.
- Mock services at the provider level; do not mock the component under test.
- Cover each UI state from the SRS: loading, success, error, empty.

## Service with HTTP

```ts
beforeEach(() => TestBed.configureTestingModule({
  providers: [provideHttpClient(), provideHttpClientTesting()],
}));

it('AC-09 maps 429 to rate-limited', () => {
  const service = TestBed.inject(AuthService);
  const http = TestBed.inject(HttpTestingController);
  let error: unknown;
  service.requestReset({ email: 'a@b.co' }).subscribe({ error: e => (error = e) });
  http.expectOne('/api/auth/reset').flush(null, { status: 429, statusText: 'Too Many' });
  expect(error).toBe('rate-limited');
});
afterEach(() => TestBed.inject(HttpTestingController).verify());
```

- One `expectOne` per expected request; for retries, flush each attempt.
- `verify()` after each test: no unexpected requests.
