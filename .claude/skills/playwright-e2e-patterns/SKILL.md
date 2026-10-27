---
name: playwright-e2e-patterns
description: Playwright E2E tests with one page object per feature flow, role/label locators and web-first assertions. Use for ACs that cross routes or need a real browser.
---

# Playwright E2E

## Page object per flow

```ts
// e2e/pages/reset-password.page.ts
export class ResetPasswordPage {
  constructor(private readonly page: Page) {}
  readonly email = () => this.page.getByLabel('Email');
  readonly send = () => this.page.getByRole('button', { name: 'Send link' });
  async goto() { await this.page.goto('/reset'); }
  async request(email: string) { await this.email().fill(email); await this.send().click(); }
}
```

```ts
// e2e/reset-password.spec.ts
test('AC-05 valid email shows the inbox message', async ({ page }) => {
  await page.route('**/api/auth/reset', r => r.fulfill({ status: 204 }));
  const reset = new ResetPasswordPage(page);
  await reset.goto();
  await reset.request('a@b.co');
  await expect(page.getByText('Check your inbox')).toBeVisible();
});
```

## Rules

- Locators: `getByRole`, `getByLabel`, `getByText`. No CSS classes or XPath.
- Assertions are web-first (`await expect(locator).toBeVisible()`), which wait for Angular to render. Never `page.waitForTimeout()`.
- Stub the backend with `page.route()` unless the SRS requires a real integration; cover the error state by fulfilling 500/429.
- One page object per feature flow in `e2e/pages/`; specs in `e2e/` named after the flow. The page object holds locators and actions, the spec holds assertions.
- Name each test with its AC id.
- Keyboard-only and viewport ACs: `page.keyboard.press('Tab')`, `page.setViewportSize({ width: 375, height: 667 })`.
- Run one spec while developing: `npx playwright test e2e/reset-password.spec.ts`.
