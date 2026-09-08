# Description

this is a project, to implement a web application that allows the user to sign-in and sign-out into the application

## Tech Stack

- Frontend:
  - React
  - Typescript
  - tailwind CSS
- Backend:
  - NestJs
  - DO Not USE: CommonJS (prefer ES Modules)
  - MongoDB

### Containers & networking

- `docker compose up --build` starts everything from one command.
- `frontend` (nginx) is the **only** container published to the host
  (`:8080`). It serves the built React app and reverse-proxies `/api/*` to
  `backend:3000` over the internal Docker network.
- `backend` and `mongo` are not published — reachable only from other
  containers.
- Because the browser only ever talks to one origin (`:8080`), there is
  **no CORS** to configure and auth cookies are same-origin.

### Auth model

- httpOnly cookie JWTs (not localStorage) — avoids XSS token theft.
- Two tokens: short-lived **access token** (15m) + longer-lived **refresh
  token** (7d, random `jti`), each in its own cookie, each with its own
  secret.
- Refresh token is SHA-256-hashed and stored on the `User` document (`refreshTokenHash`); `POST /auth/refresh`
  verifies against that hash and **rotates** (issues + stores a new pair).
  `POST /auth/logout` clears it server-side (`null`), so a copied cookie
  stops working immediately, not
  just once it expires.
- Frontend's `apiFetch` wrapper retries once via `/auth/refresh` on a 401,
  so the 15m access-token expiry is invisible to the user.

## Cross-cutting

- Logging: `nestjs-pino` (structured JSON), replacing Nest's default logger.
- Errors: one global `HttpExceptionFilter` — known `HttpException`s pass
  through as `{ statusCode, message }`; anything unexpected is logged with
  its stack trace and returned as a generic `500`.
- API docs: `@nestjs/swagger`, served at `/api/docs`.
- CI: GitHub Actions — lint + unit + e2e for backend, lint + test + build
  for frontend, then a Docker build/push job on `main`.

## Code Principles

- Follow NestJS best practices — module structure, dependency injection, decorator usage, error handling patterns, and the Nest way of organizing concerns.
- Write only TypeScript — strict mode enabled. No any escape hatches, no untyped dependencies, proper generic usage.
- Design the plan in separate milestones — break the work into discrete, deliverable chunks (e.g., "Users module", "Auth service", "Protected routes", "Frontend forms"). Each milestone should be independently testable and reviewable.
- After each milestone, review the code and suggest improvements — identify refactoring opportunities, potential bugs, performance issues, security gaps, or areas that could be cleaner or more maintainable. Be specific.
- Wait after each milestone for user review — do not proceed to the next milestone until the user has reviewed the current one and given the go-ahead.
- Security-first mindset — validate on both client and server, hash passwords properly, use httpOnly cookies, avoid leaking sensitive data in responses or logs. Call out security decisions in the README.
- Test as you go — unit tests on core business logic (auth service), e2e tests on API endpoints, component tests on form validation. Don't batch testing at the end. Aim for ~10–14 focused tests that each buy a distinct guarantee.
- Share the single source of truth — validation rules (password regex, email format, name length) are defined once: in a Zod schema on the web app, mirrored in the class-validator DTOs on the API. The API is always authoritative.
- Prefer explicit over magical — clear error messages, typed responses, documented API contracts (Swagger), straightforward route guards. Avoid clever abstractions.
- Keep the README honest — document trade-offs (e.g., why in-memory access token + httpOnly refresh cookie instead of localStorage), deployment assumptions, what would come next with more time. This is part of the deliverable.
- Capture decisions in AI.md — not boilerplate, but genuine notes on what worked, what needed reworking, which AI prompts were effective, and what you did differently from the first suggestion.

## Code Review Checklist

After each milestone, review for:

- Correctness: Does it meet the requirement? Are edge cases handled?
- Types: Is everything strictly typed? Any any?
- Testing: Is there a test? Does it pass?
- Security: Are there any leaks, weak hashing, or client-side trust?
- Maintainability: Would a colleague understand this in 6 months?
- NestJS idioms: Are we using modules, services, guards, decorators the right way?
- Performance: Any obvious N+1 queries, unbounded loops, or unnecessary re-renders?