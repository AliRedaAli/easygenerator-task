# Signup / Login / Logout App

React + Tailwind frontend, NestJS + MongoDB backend, npm workspaces monorepo.

## Run with Docker (recommended)

```
npm run setup:env
docker compose up --build
```

`npm run setup:env` copies `backend/.env.example` to `.env`, configures the
Docker MongoDB service URI, and generates random JWT secrets. It will not
overwrite an existing `.env`.

Then open http://localhost:8080.

Everything (Mongo, backend, frontend) starts from that one command, behind
the one published port — the frontend container serves the app and proxies
`/api/*` to the backend internally. `backend` and `mongo` aren't published to
the host; only `frontend` (`:8080`) is.

## Tests & linting

```bash
npm run lint -w backend
npm run test -w backend        # unit tests (vitest)
npm run test:e2e -w backend    # e2e tests against an in-memory MongoDB

npm run lint -w frontend
npm run test -w frontend
npm run build -w frontend
```

The same commands run in CI on every push/PR — see `.github/workflows/ci.yml`.

## API docs

Swagger UI is served at `/api/docs` (e.g. http://localhost:8080/api/docs
when running via Docker).

## Project layout

```
backend/   NestJS API (auth, users) — MongoDB via Mongoose
frontend/  React + Tailwind SPA — signup/login/home, session via AuthContext
```

See `CLAUDE.md` for the full architecture and auth-model writeup.
