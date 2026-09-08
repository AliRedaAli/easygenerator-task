# Signup / Login / Logout App

React + Tailwind frontend, NestJS + MongoDB backend, single repo.

## Run

```
docker compose up --build
```

Then open http://localhost:8080.

Everything (Mongo, backend, frontend) starts from that one command, behind
the one published port — the frontend container serves the app and proxies
`/api/*` to the backend internally.

## Local development (hot reload, outside Docker)

```
npm install
npm run start:dev -w backend   # http://localhost:3000
npm run dev -w frontend        # http://localhost:5173, proxies /api to :3000
```
