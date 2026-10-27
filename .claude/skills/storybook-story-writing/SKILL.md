---
name: storybook-story-writing
description: Write Storybook (CSF3) stories for every new or extended component — Default plus loading, error and empty variants, args matching the component's inputs. Use after a component's tests are green.
---

# Storybook stories

Story names come from the SRS componentMap (e.g. `Auth/ResetRequestForm/Default`).

```ts
// reset-request-form.component.stories.ts
import type { Meta, StoryObj } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';

const meta: Meta<ResetRequestFormComponent> = {
  title: 'Auth/ResetRequestForm',
  component: ResetRequestFormComponent,
  decorators: [applicationConfig({ providers: [{ provide: AuthService, useValue: authStub('success') }] })],
  args: { initialEmail: '' },
};
export default meta;
type Story = StoryObj<ResetRequestFormComponent>;

export const Default: Story = {};
export const Prefilled: Story = { args: { initialEmail: 'a@b.co' } };
export const Loading: Story = {
  decorators: [applicationConfig({ providers: [{ provide: AuthService, useValue: authStub('pending') }] })],
};
export const Error: Story = {
  decorators: [applicationConfig({ providers: [{ provide: AuthService, useValue: authStub('server') }] })],
};
```

## Rules

- One stories file next to each new component; extended components get the new variant added to their existing file.
- Variants: `Default` always; `Loading`, `Error`, `Empty` whenever the component has those states.
- `args` names match the component's `input()` names exactly; outputs appear as actions automatically.
- Drive states through stubbed services or inputs, never by editing component internals.
- No real HTTP in stories.
- Story titles follow the existing hierarchy found with `Glob src/**/*.stories.ts`.
