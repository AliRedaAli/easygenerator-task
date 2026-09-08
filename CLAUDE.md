# Description

this is a simple project, to implement a module that allows the user to sign-in and sign-out into the application
## Tech Stack

- Frontend:
  - React
  - Typescript
  - -tailwind CSS
- Backend:
  - NestJs
  - DO Not USE: CommonJS (prefer ES Modules)
  - MongoDB

## Architecture

```
/
├── package.json            # root, npm workspaces: ["backend", "frontend"]
├── docker-compose.yml      # mongo + backend + frontend
├── backend/                # NestJS (ES modules, global prefix "api")
└── frontend/               # React (Vite) + Tailwind
```

### Containers & networking

- `docker compose up --build` starts everything from one command.
- `frontend` (nginx) is the **only** container published to the host
  (`:8080`). It serves the built React app and reverse-proxies `/api/*` to
  `backend:3000` over the internal Docker network.
- `backend` and `mongo` are not published — reachable only from other
  containers.
- Because the browser only ever talks to one origin (`:8080`), there is
  **no CORS** to configure and auth cookies are same-origin.
- Local (non-Docker) dev mirrors this: Vite's dev-server proxy forwards
  `/api/*` to a locally-running backend on `:3000`.

### Auth model

- httpOnly cookie JWTs (not localStorage) — avoids XSS token theft.
- Two tokens: short-lived **access token** (15m) + longer-lived **refresh
  token** (7d, random `jti`), each in its own cookie, each with its own
  secret.
- Refresh token is SHA-256-hashed (not bcrypt — bcrypt truncates input at 72
  bytes, which would hash every refresh token for a user to the same digest
  since they share a long identical prefix; SHA-256 is also the right tool
  here since the token is already high-entropy, unlike a password) and
  stored on the `User` document (`refreshTokenHash`); `POST /auth/refresh`
  verifies against that hash and **rotates** (issues + stores a new pair).
  `POST /auth/logout` clears it server-side (`null`), so a copied cookie
  stops working immediately, not
  just once it expires.
- Frontend's `apiFetch` wrapper retries once via `/auth/refresh` on a 401,
  so the 15m access-token expiry is invisible to the user.

## Endpoints (`/api/auth/*`)

- `POST /signup` — `{ name, email, password }` → sets both cookies, returns `{ name, email }`.
- `POST /login` — `{ email, password }` → sets both cookies, returns `{ name, email }`.
- `POST /refresh` — rotates both cookies.
- `POST /logout` — revokes the refresh token, clears both cookies.
- `GET /me` — returns the current user from the access token.

## Validation (signup)

- `name`: min 3 chars.
- `email`: valid email format.
- `password`: min 8 chars, at least one letter, one number, one special
  character.

## Data

- Mongoose (`@nestjs/mongoose`) against MongoDB. Single `User` collection:
  `name`, `email` (unique), `passwordHash`, `refreshTokenHash`.

## Cross-cutting

- Logging: `nestjs-pino` (structured JSON), replacing Nest's default logger.
- Errors: one global `HttpExceptionFilter` — known `HttpException`s pass
  through as `{ statusCode, message }`; anything unexpected is logged with
  its stack trace and returned as a generic `500`.
- API docs: `@nestjs/swagger`, served at `/api/docs`.
- CI: GitHub Actions — lint + unit + e2e for backend, lint + test + build
  for frontend, then a Docker build/push job on `main`.