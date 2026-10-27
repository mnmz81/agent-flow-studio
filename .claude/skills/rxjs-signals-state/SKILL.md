---
name: rxjs-signals-state
description: Choose between signals and RxJS for state, pick the right flattening operator, and clean up subscriptions with takeUntilDestroyed. Use when writing component or service state, streams or effects.
---

# Signals and RxJS

## Which one

| Need | Use |
|---|---|
| Local or derived UI state | `signal()`, `computed()` |
| Side effect when a signal changes (logging, storage) | `effect()` — never to set other signals; use `computed()` for that |
| Events over time: HTTP, typing, websockets, timers | RxJS |
| An observable's value in a template or computed | `toSignal(obs$, { initialValue })` |
| A signal as a stream input | `toObservable(sig)` |

Do not mix in one piece of state: a value is either a signal or a stream, then converted once at the edge.

## Flattening operators

| Operator | Use when | Example |
|---|---|---|
| `switchMap` | only the latest result matters; cancel the old one | search-as-you-type |
| `concatMap` | order matters; queue | saving edits in sequence |
| `mergeMap` | independent, parallel | uploading several files |
| `exhaustMap` | ignore new triggers while busy | submit button double-click |

## Subscriptions

- Prefer no manual subscribe: `toSignal()` or the `async` pipe.
- When you must subscribe in a component or directive: `.pipe(takeUntilDestroyed(this.destroyRef))` — or call `takeUntilDestroyed()` with no argument inside an injection context (constructor/field initializer).
- Never nest `subscribe` inside `subscribe`; flatten with an operator above.
- `interval`/`timer`/`fromEvent` always end with `takeUntilDestroyed`.

```ts
private readonly destroyRef = inject(DestroyRef);
readonly results = toSignal(
  toObservable(this.query).pipe(debounceTime(300), distinctUntilChanged(), switchMap(q => this.api.search(q))),
  { initialValue: [] },
);
```
