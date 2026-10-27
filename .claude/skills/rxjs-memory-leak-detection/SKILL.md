---
name: rxjs-memory-leak-detection
description: Find RxJS subscription leaks in a diff — subscriptions without takeUntilDestroyed/unsubscribe, uncleaned interval/timer/fromEvent, long-lived subjects, HTTP in components. Use in every Stage 2 review.
---

# RxJS leak detection

## Find candidates

In changed files, list every `.subscribe(`, `interval(`, `timer(`, `fromEvent(`, `setInterval(`, `addEventListener(`, `new Subject`, `new BehaviorSubject`, `effect(`.

## Decide for each

| Candidate | Safe when | Leak when → severity |
|---|---|---|
| `.subscribe` in component/directive | piped through `takeUntilDestroyed(...)`, or the source completes on its own (single HTTP call) and nothing else is chained | infinite source (store, router events, valueChanges, interval, Subject) without cleanup → MUST_FIX |
| `interval` / `timer(_, period)` / `fromEvent` | ends with `takeUntilDestroyed` or `take(n)` | otherwise → MUST_FIX |
| `setInterval` / `addEventListener` | cleared in `DestroyRef.onDestroy` | otherwise → MUST_FIX |
| `subscribe` in a root service | the service lives for the app on purpose | subscribing per call (each method call adds a subscription) → MUST_FIX |
| `effect()` created outside an injection context | given an `injector` and destroyed | otherwise → SHOULD_FIX |
| `Subject` exposed publicly | exposed as `.asObservable()` | public `next()` callers → SHOULD_FIX |
| HTTP call in a component | — | always → MUST_FIX (move to a service, see architecture-review) |

`takeUntilDestroyed()` with no argument is valid only in an injection context (field initializer or constructor); elsewhere it needs `this.destroyRef`. A call in `ngOnInit` without the argument throws at runtime → MUST_FIX.

## Report

File, line, the source that never completes, and the fix (`.pipe(takeUntilDestroyed(this.destroyRef))` or `toSignal(...)`).
