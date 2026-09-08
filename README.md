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