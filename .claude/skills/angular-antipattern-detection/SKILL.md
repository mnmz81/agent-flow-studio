---
name: angular-antipattern-detection
description: Find Angular anti-patterns in a diff — missing OnPush/standalone, decorator inputs, constructor subscriptions, nested subscribes, direct DOM access, ngOnChanges where computed() fits, ChangeDetectorRef misuse. Use in every Stage 2 review of Angular code.
---

# Angular anti-patterns

Scan only changed files (`gh pr diff <n>`), but read enough surrounding code to be sure.

| Look for | Why it is wrong | Severity | Fix to suggest |
|---|---|---|---|
| Component without `changeDetection: OnPush` | needless change detection | SHOULD_FIX | add OnPush |
| `NgModule` or `standalone: false` in new code | project is standalone-only | MUST_FIX | standalone + `imports` |
| `@Input()` / `@Output()` decorators in new code | project uses signal APIs | SHOULD_FIX | `input()`, `output()`, `model()` |
| `.subscribe(` in a constructor or `ngOnInit` without cleanup | leak (see rxjs-memory-leak-detection) | MUST_FIX | `takeUntilDestroyed()` / `toSignal()` |
| `subscribe` inside `subscribe` | race conditions, leaks | MUST_FIX | flatten with switchMap/concatMap |
| `document.`, `window.` or `nativeElement` writes | breaks SSR/testing, bypasses Angular | MUST_FIX | binding, Renderer2 or CDK |
| `ngOnChanges` deriving one input from another | duplicated state | SHOULD_FIX | `computed()` |
| `ChangeDetectorRef.detectChanges()` / `markForCheck()` sprinkled to "fix" rendering | hides a state bug | SHOULD_FIX | signals or async pipe |
| `@for` without `track`, or `*ngFor` without `trackBy` on large lists | re-renders every row | SHOULD_FIX | `track item.id` |
| `HttpClient` injected in a component | logic in the view layer | MUST_FIX | move to a service |
| `any` in new code | defeats strict mode | SHOULD_FIX | real type |
| Function calls in templates doing work (`{{ total() }}` where `total` is a method, not a signal) | runs every check | NIT | `computed()` |

Report only real occurrences with file and line. Do not report a pattern the LTM conventions explicitly allow.
