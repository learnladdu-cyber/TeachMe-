# HelpDeskFlow

A multi-tenant customer-support platform for ticketing, knowledge bases,
automation, reporting and administration — with a polished agent workspace and
a branded customer portal.

## Stack

- **Next.js (App Router) + TypeScript** — web UI, server actions and REST API
  route handlers
- **PostgreSQL + Prisma** — data model with per-row tenant scoping
- **Tailwind-free CSS** — a single global stylesheet, accessible and responsive

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start PostgreSQL (or point `DATABASE_URL` at your own instance):

   ```bash
   docker compose up -d
   ```

3. Create `.env` from the template and adjust if needed:

   ```bash
   cp .env.example .env
   ```

4. Apply the schema:

   ```bash
   npm run db:push
   ```

5. Run the app:

   ```bash
   npm run dev
   ```

   Open http://localhost:3000

## Seed data

`npm run db:seed` writes only the real plan catalog (Free, Growth, Business,
Enterprise). It is idempotent and safe to run against any database — no sample
organizations, tickets or users are created. Create the first organization
through the public signup flow at `/register`.

## What works

- **Public site**: marketing home, features and pricing.
- **Auth**: self-serve signup (creates organization + admin), login, logout,
  database-backed sessions in HTTP-only cookies, scrypt password hashing.
- **Multi-tenancy**: `organization_id` on every tenant-owned row; server-side
  membership checks on every read/write.
- **Customer portal**: dashboard, create ticket, ticket detail with public
  replies only, and a profile page for name/locale and password changes.
- **Agent workspace**: unified inbox with queues/search, ticket workspace with
  status transitions (enforced by a server-side map), priority, assignment,
  public replies and internal notes, and an audit event trail.
- **Customers directory**: everyone in the organization with their request
  counts and last activity.
- **Knowledge base**: draft/published articles with categories, slugs and view
  counts.
- **Automation**: trigger / condition / action rules with enable/disable and run
  history.
- **Reports**: volume, backlog, response and resolution metrics with filters.
- **Settings**: organization profile, plan and member role/status management
  (organization admins only), each change written to the audit log.
- **Platform admin**: tenant overview with cross-tenant metrics and an audit log
  entry for each access.

## API (v1)

All routes are tenant-scoped and return a consistent envelope:
`{ data }` or `{ error: { code, message, request_id, field_errors? } }`.

| Method + route | Purpose |
| --- | --- |
| `POST /api/auth/register` | Create user + organization + admin membership |
| `POST /api/auth/login` / `POST /api/auth/logout` | Session lifecycle |
| `GET /api/me` | Current user, active org and memberships |
| `GET /api/organizations/:orgId/tickets` | List/search tickets (org-scoped) |
| `POST /api/organizations/:orgId/tickets` | Create a ticket |
| `GET /api/organizations/:orgId/tickets/:ticketId` | Read ticket + permitted messages |
| `PATCH /api/organizations/:orgId/tickets/:ticketId` | Update status/priority/assignment |
| `POST /api/organizations/:orgId/tickets/:ticketId/messages` | Public reply or internal note |
| `GET /api/admin/organizations` | Platform admin tenant list (audited) |

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Prisma generate + production build |
| `npm run start` | Start the production server |
| `npm run typecheck` | TypeScript, no emit |
| `npm run db:push` | Apply schema to the database |
| `npm run db:migrate` | Create/apply a migration |
| `npm run db:seed` | Write the plan catalog (safe, idempotent) |
| `npm run db:studio` | Browse data with Prisma Studio |

## Security

- **Sessions**: opaque 256-bit tokens stored only as SHA-256 hashes; HTTP-only,
  `SameSite=Lax`, `Secure` and `__Host-` prefixed when served over HTTPS. Idle
  timeout (`SESSION_IDLE_MINUTES`, default 8h) and 14-day absolute expiry, with a
  cap on concurrent sessions per user. Sessions are listed and individually
  revocable from the profile page, and all others are revoked on password change.
- **Passwords**: scrypt with per-password salts and timing-safe comparison. A
  strength policy enforces length, character variety and blocks common or
  personal values, applied at signup and on change.
- **Brute-force protection**: per-IP and per-account rate limits on sign-in and
  sign-up, plus progressive account lockout (`MAX_LOGIN_ATTEMPTS`,
  `LOCKOUT_MINUTES`). Unknown emails still run a dummy hash so timing does not
  reveal account existence.
- **CSRF / request hygiene**: state-changing API routes verify same-origin and
  require `application/json`, with a request body size cap. SameSite cookies add
  a second layer.
- **Input validation & sanitization**: every API body, query string, route
  parameter and server-action form field is validated with Zod (`src/lib/
  validation/schemas.ts`). Free text is length-bounded and stripped of control
  characters; structured fields have HTML tags removed; JSON bodies reject
  prototype-pollution keys (`__proto__`/`constructor`/`prototype`); route
  parameters are UUID-checked before touching the database. React escapes all
  rendered output, with `escapeHtml`/`stripTags` helpers available for any raw
  HTML boundary.
- **Transport & headers**: CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`,
  `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`,
  `Cross-Origin-Resource-Policy`, `X-Permitted-Cross-Domain-Policies` and
  `Origin-Agent-Cluster` on every response; API responses are `no-store` and
  carry an `x-request-id`.
- **Audit trail**: authentication events (login success/failure/lockout, logout,
  registration, password changes, session revocations) are recorded with
  pseudonymised IP and user-agent (HMAC via `APP_SECRET`).
- **Tenant isolation**: every organization-owned query includes `organizationId`;
  internal notes are filtered server-side; UI hiding is never authorization.
- **Defense in depth**: middleware bounces unauthenticated traffic from `/app`
  and `/portal`, while server layouts and route handlers re-check authorization.

Generate the production secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Run `npm run security:audit` to check dependencies for known vulnerabilities.

## Roadmap

Live chat/realtime, email channels and threading, SLA timers and business-hours
calendars, saved replies/macros, integrations/webhooks, billing and payments,
notifications, and platform admin tenant lifecycle actions.
