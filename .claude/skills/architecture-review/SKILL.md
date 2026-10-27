---
name: architecture-review
description: Check layer boundaries and dependency direction in a PR — component → service → HTTP, no business logic in components, single responsibility, no circular imports, feature isolation. Use in every Stage 2 review.
---

# Architecture review

## Layers (dependencies point down only)

```
route / page component      — composes, no logic
  presentational components — inputs/outputs only, no services except UI helpers
    feature services         — business rules, state, orchestration
      data services / HTTP   — HttpClient, DTO ↔ model mapping
```

## Checks

| Check | How | Severity |
|---|---|---|
| Component contains business rules (calculations, validation rules, permission logic beyond display) | read component class bodies | SHOULD_FIX → move to a service |
| Component injects `HttpClient` | grep `inject(HttpClient)` in `*.component.ts` | MUST_FIX |
| Upward or sideways import (service imports a component; feature A imports feature B's internals) | read import lines of changed files | MUST_FIX |
| Circular import | two changed files import each other, directly or via an index | MUST_FIX |
| Shared code placed inside a feature folder, or feature code in `shared/` | path vs. number of users | SHOULD_FIX |
| One class doing several jobs (> ~300 lines, or unrelated public methods) | read | SHOULD_FIX → split |
| DTOs leaking into templates | template uses API field names that the SRS model renames | SHOULD_FIX → map in the data service |
| New global state where local state suffices | `providedIn: 'root'` store for one screen | NIT |
| Contradicts an ADR in the LTM slice | compare | MUST_FIX, name the ADR |

Keep findings structural. Style and naming belong to lint, not here.
