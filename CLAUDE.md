# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

TodoN — a personal + team task manager focused on "what to do today". pnpm monorepo:

- `apps/web` — Next.js 16 (App Router, React 19, Tailwind 4). The main app and the **only backend**: all API routes live here.
- `apps/mobile` — Expo 54 / React Native, React Navigation 7. Partial feature coverage (~40%); talks to the web app's `/api/*`.
- `packages/shared` (`@todon/shared`) — types, the `TodoNApiClient` used by both clients, and framework-free business logic (capacity, dashboard suggestions, flexible-repeat, weight estimate, category classify, subtask suggest, today-progress). Consumed as raw TS source via `workspace:*` — no build step.

`ROADMAP.md` (Japanese) has the full feature list, release phases, and known gaps (no tests, no CI, dual auth mid-migration).

## Commands

Run from the repo root:

```bash
pnpm dev:web            # Next dev server (localhost:3000)
pnpm dev:mobile         # expo start
pnpm build:web          # prisma generate && next build
pnpm lint               # eslint across all workspaces
pnpm format             # prettier --write .
pnpm check              # format:check + lint (run before committing)
```

Database (Prisma, targets `apps/web`):

```bash
pnpm db:migrate          # prisma migrate dev (local schema change)
pnpm db:migrate:deploy   # apply migrations to prod
pnpm db:generate         # regenerate client after schema edits
pnpm db:push             # push schema without a migration
```

There is **no `typecheck` script**. Check types per app with `pnpm --filter web exec tsc --noEmit` (or `mobile`). There is **no test runner set up** — adding one is a roadmap item.

`apps/web` needs `.env` (see `apps/web/.env.example`): `SUPABASE_DATABASE_URL` + `SUPABASE_DIRECT_URL` (Prisma), `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `AUTH_SECRET` (legacy JWT, 16+ chars). Mobile reads `EXPO_PUBLIC_API_URL` / `expoConfig.extra.apiUrl`.

## Framework-version warnings (from per-app AGENTS.md)

- **Next.js**: this is a newer major with breaking changes vs. older knowledge. Consult `apps/web/node_modules/next/dist/docs/` before writing Next code.
- **Expo**: check `https://docs.expo.dev/versions/v54.0.0/` before writing mobile code.

## Architecture

### Request path (web)

`app/api/*/route.ts` → `src/server/*` module → Prisma. Route handlers stay thin: they call `requireUser(req)` from `src/lib/http.ts`, parse the body with a Zod schema from `src/lib/schemas.ts`, delegate to a `src/server/*` function, and wrap everything in `try/catch` returning `handleApiError(error)` (`src/lib/api-utils.ts`). Business logic and all Prisma access belong in `src/server/*`, never in the route file.

Prisma rows are converted to shared API types by mappers in `src/lib/mappers.ts` before leaving the server layer — API responses return mapped types (`Task`, `TaskWithPeople`, …), not raw Prisma models.

### Auth — Supabase only

A single mechanism: **Supabase Auth**. Web uses the SSR session cookies set by `@supabase/ssr` (route handlers use `createRouteHandlerClient`, server components `createClient`, middleware `createMiddlewareClient` + `updateSession`). Mobile sends the Supabase **access token** as `Authorization: Bearer` and stores the refresh token; `TodoNApiClient` retries once through `POST /api/auth/refresh` on a 401.

A Supabase user is linked to a Prisma `User` row via `supabaseId` (`src/lib/supabase/sync-user.ts`, `findPrismaUserIdBySupabaseAuth`). Server entry points: `getUserIdFromRequest` / `requireUser` (`src/lib/http.ts`) for API routes — `supabase.auth.getUser(bearerToken)` or cookie session; `getCurrentUserId` (`src/lib/auth/session.ts`) for server components. `src/middleware.ts` gates the protected route list and redirects to `/login`.

`/api/auth/{login,register,refresh,logout}` are the only auth endpoints. Register may return `needsEmailConfirmation` when email confirmation is enabled in Supabase.

### Personal ↔ Team scope

The app has one global "scope" toggle: personal or a specific team. Scope lives in a `todon_scope` cookie (+ localStorage mirror), parsed by `src/lib/scope-preferences.ts`. Server-side, `getValidatedServerAppScope(userId)` (`src/lib/scope-server.ts`) reads the cookie and **downgrades to personal if the user is no longer a member** of the team.

`Task` rows carry `scope` (`'personal'` | `'team'`), `userId`, and optional `teamId`. Authorization for any task goes through `src/server/team-access.ts` — `requireTaskAccess` / `requireTaskEdit` (and `requireMembership` / `requireTeamAdmin` / `requireTeamOwner` for teams). Team roles: `owner` | `admin` | `member`; members can only edit tasks they're assignee/owner of. Personal task queries filter `scope: 'personal'`; team task creation routes through `src/server/team-tasks.ts`.

### Shared logic boundary

`packages/shared` must stay free of Next/Expo/Prisma imports — it's pure TS consumed as source by both apps. Domain types are centralized in `packages/shared/src/types.ts`; do not redefine `Task`, `Team`, etc. locally. Rule-based "AI" features (subtask suggestions, category classification, weight estimation, dashboard insights) are heuristics in shared, exposed through `/api/tasks/suggest-*` and `/api/tasks/estimate-weight`.

## Conventions

- Web imports use the `@/*` alias (`apps/web/src/*`).
- User-facing strings and error messages are **Japanese** — match that when adding them. Match existing comment language per file.
- Import order is enforced by `eslint-plugin-simple-import-sort`; run `pnpm format` rather than hand-ordering.
- Prisma `schema.prisma` uses string columns (not DB enums) for `role`, task `scope`, `status`, etc. — see the `// owner | admin | member` style comments.
