# Signup / Login / Logout App

React + Tailwind frontend, NestJS + MongoDB backend, npm workspaces monorepo.

## Run with Docker (recommended)

```
docker compose up --build
```

Then open http://localhost:8080.

Everything (Mongo, backend, frontend) starts from that one command, behind
the one published port — the frontend container serves the app and proxies
`/api/*` to the backend internally. `backend` and `mongo` aren't published to
the host; only `frontend` (`:8080`) is.

## Run locally without Docker

Needs Node 20+ and a local MongoDB (or point `MONGODB_URI` at any reachable
instance).

```bash
npm install               # installs both workspaces from the root lockfile

cp backend/.env.example backend/.env   # edit MONGODB_URI / JWT secrets as needed
npm run start:dev -w backend           # http://localhost:3000/api

npm run dev -w frontend                # http://localhost:5173 (Vite dev server)
```

Running the frontend this way talks directly to the backend's own port
rather than through the nginx `/api` proxy, so set `VITE_API_URL` (or add a
Vite dev proxy) if you need `/api/*` calls to reach `localhost:3000`.

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
