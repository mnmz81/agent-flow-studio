---
name: angular-standalone-components
description: Angular 17+ component conventions for this project — standalone, OnPush, signal inputs/outputs, inject(), built-in control flow. Use when creating or changing any component.
---

# Angular standalone components

```ts
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-reset-request-form',
  standalone: true,
  imports: [TextFieldComponent, ButtonComponent],
  templateUrl: './reset-request-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetRequestFormComponent {
  private readonly auth = inject(AuthService);

  readonly initialEmail = input('');              // signal input
  readonly submitted = output<string>();          // output
  protected readonly email = signal('');
  protected readonly valid = computed(() => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(this.email()));

  protected submit() {
    if (this.valid()) this.submitted.emit(this.email());
  }
}
```

## Rules

- `standalone: true`, no NgModules. List every used component, directive and pipe in `imports`.
- `ChangeDetectionStrategy.OnPush` always.
- Inputs: `input()` / `input.required()`; two-way: `model()`; outputs: `output()`. No `@Input` / `@Output` decorators in new code.
- Dependencies through `inject()`, not constructor parameters.
- Templates use `@if`, `@for (x of xs; track x.id)`, `@switch`. `@for` always has a `track`.
- Components hold view state only. HTTP and business rules live in services (see angular-http-client).
- File names kebab-case: `reset-request-form.component.ts|html|scss|spec.ts`. Selector prefix `app-`.
- Lazy-load feature routes: `loadComponent: () => import('./x.component').then(m => m.XComponent)`.
- No direct DOM access (`document`, `ElementRef.nativeElement` mutation); use bindings or the CDK.
- Follow the LTM conventions in your context when they are more specific than this list.
