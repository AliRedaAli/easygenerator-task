# AI Usage

## How I worked

I used Claude as a pair-programmer throughout, in three distinct modes:

1. **Planning before code.** Before writing anything, I had it produce a full technical plan — stack choices with justifications, file-by-file structure, the API contract, and a timeboxed milestone sequence. I reviewed and argued with that plan before a single file was scaffolded. Several decisions in this repo came out of that argument rather than the first draft.
2. **Scaffolding and boilerplate.** Nest modules, DTO decorators, Tailwind form markup, the CI workflow, Dockerfiles, test skeletons.
3. **Review at milestone boundaries.** I set up a `CLAUDE.md` in the repo instructing the assistant to break work into milestones, review its own output after each, and stop for my review before continuing. That constraint mattered more than any individual prompt — it stopped the "generate 20 files, hope they compose" failure mode.

## What was AI-assisted vs. what I decided

| Area | AI-assisted | My call |
|---|---|---|
| Nest module scaffolding, DI wiring | Yes | — |
| DTO validation decorators + password regex | Yes | Verified the regex against each rule in the spec myself |
| Token strategy (cookies, rotation, revocation) | Draft only | Substantially reworked — see below | 
| Same-origin proxy vs CORS | Suggested after I asked | Adopted |
| State management (Context vs Redux vs TanStack Query) | Suggested Query + Zustand | Chose plain Context | 
| Log redaction, exception filter | Yes | Reviewed |
| CI workflow, Dockerfiles, nginx config | Yes | Reviewed and corrected |
| Tests | Skeletons AI, cases mine | The e2e cases that matter (rotation, reuse rejection, logout revocation) are mine |
## Prompts and approaches that worked

**Asking for a plan with explicit trade-off columns, not code.** The single highest-leverage thing I did. Requesting "for each choice, say what you're choosing it *over* and why" surfaced decisions I'd otherwise have accepted silently — e.g. it recommended Mongoose over Prisma specifically because Prisma's MongoDB support needs a replica set for transactions. That's a real reason I could evaluate, not a preference.

**Interrogating the plan before accepting it.** I pushed back on three specific points — what "monorepo" concretely bought me, whether global state needed Redux, and whether frontend and backend would share a port. The third question is what produced the nginx/Vite proxy design in this repo. The original plan had two origins with `withCredentials` and a CORS allowlist; asking "will they be on the same port?" exposed that as unnecessary complexity, and the assistant's revised answer — proxy `/api` so the browser only ever sees one origin — is what shipped. Worth noting the plan was wrong first and only got there because I asked.

**Constraining the workflow in `CLAUDE.md` rather than per-prompt.** Standing instructions ("only TypeScript", "follow Nest idioms", "milestones with a review gate", "ES modules, never CommonJS") applied consistently without me restating them. The ESM rule in particular is why the backend uses `.js` import specifiers throughout instead of drifting into CommonJS partway.

**Asking for failure modes, not features.** "List the ways this endpoint leaks information" produced the uniform `Invalid email or password` response and the log-redaction config. Framing it as an attack surface question got better output than asking it to "make the endpoint secure".

## What I changed, rejected, or had to fix

**Token storage.** The first suggestion was the standard tutorial answer — access token in `localStorage`. I rejected that outright: it's XSS-readable. The revised plan proposed access token in memory + refresh token in an httpOnly cookie. I went further and put **both** tokens in httpOnly cookies with separate secrets. The in-memory approach means a page refresh always costs a refresh round-trip and the token has to be threaded through a module-scoped variable so the fetch wrapper can read it; two cookies are simpler, and since the app is same-origin behind the proxy, `SameSite=Lax` already blocks cross-site POST, so the CSRF exposure that usually argues against cookie-borne access tokens doesn't apply here.

Env Secerts: AI started to hardcode the JWS secrets in the docker-compose file. I changed that to take it from the .env file .. also to make the setup better I created a command to copy the .env.example and generate the secerts automatically (see the README.md file)

**State management.** Recommendation was TanStack Query for the user object plus a module variable or Zustand for the token. Sound reasoning for a larger app, but with both tokens in httpOnly cookies there *is* no token for the client to hold, and the only client state left is one user object. Adding a server-state library and a store to manage one object is ceremony. Plain `AuthContext` with `useState`, ~50 lines, no dependencies.

## What I verified myself

Every AI-generated file was read before it was committed. Beyond that:

- Ran the full flow end-to-end through `docker compose up` from a clean state — signup, refresh after access-token expiry, logout, and confirming the revoked refresh cookie stops working.
- Wrote the e2e assertions for the security properties rather than the happy path: that refresh **rotates**, that the old token is rejected after rotation, and that logout revokes server-side so a copied cookie is dead.
- Checked the password regex against each rule in the spec independently rather than trusting the generated one.
- CI runs lint, unit tests, e2e against in-memory MongoDB, and the frontend build on every push — that's the backstop for anything I missed by eye.

