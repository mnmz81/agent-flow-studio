---
name: angular-http-client
description: Typed HttpClient services that match the SRS API contract, with error mapping, retry and functional interceptors. Use when a feature calls a backend.
---

# HTTP in Angular

## Service per resource

```ts
export interface ResetRequest { email: string }
export type ResetError = 'rate-limited' | 'server' | 'network';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  requestReset(body: ResetRequest): Observable<void> {
    return this.http.post<void>('/api/auth/reset', body).pipe(
      retry({ count: 2, delay: 500, resetOnSuccess: true }),
      catchError((e: HttpErrorResponse) => throwError(() => toResetError(e))),
    );
  }
}

function toResetError(e: HttpErrorResponse): ResetError {
  if (e.status === 0) return 'network';
  if (e.status === 429) return 'rate-limited';
  return 'server';
}
```

## Rules

- Components never inject `HttpClient`; they call a service.
- Request and response types are interfaces named after the SRS contract. No `any`.
- Map HTTP errors to a small domain union the UI can switch on; the UI shows the SRS error text for each.
- Retry only idempotent or safe calls, and only on network/5xx errors. Never retry 4xx except 429.
- Base URL from `environment`, not hard-coded hosts.

## Interceptors (functional)

```ts
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(TokenStore).token();
  return next(token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req);
};
// app.config.ts
provideHttpClient(withInterceptors([authInterceptor]))
```

Cross-cutting concerns (auth header, correlation id, global 401 → login) go in interceptors, not in each service.
