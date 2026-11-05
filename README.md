# AI Job Agent

Free-first job discovery assistant. Users register, upload a PDF/DOCX/TXT resume, review extracted skills, configure preferences, and receive explainable recommendations from authorized employer ATS feeds. Users always apply manually; applications are never submitted automatically.

## Implemented local MVP

- React 19 + Vite + TypeScript authenticated dashboard.
- Express 5 API with Helmet, CORS, JSON limits, Zod validation, JWT sessions, and bcrypt password hashing.
- User registration, login, `/api/me`, user-scoped preferences, and persistent local JSON storage at `data/store.json`.
- PDF extraction with `pdf-parse`, DOCX extraction with `mammoth`, TXT support, 5 MB upload limit, MIME allowlist, and deterministic engineering-skill extraction.
- Greenhouse and Lever connector adapters behind a provider-neutral `JobSourceConnector` interface.
- Global job deduplication, HTTPS application URL validation, source confidence labels, hard filters, weighted matching, and human-readable explanations.
- Save, dismiss, and mark-applied states.
- Worker-run recommendation refresh and persisted notification preparation records.
- Responsive dashboard with sign-in, sign-up, recommendation cards, explanations, actions, and sign-out.
- Docker Compose PostgreSQL service reserved for the production repository migration.

## Workflow

```text
Register/login -> upload resume -> extract/review skills -> set preferences
-> ingest authorized ATS jobs -> normalize/deduplicate/verify
-> hard-filter and rank -> show explanations -> save/dismiss/apply manually
-> prepare digest notification
```

## Repository structure

```text
apps/api/                 Express API, auth, persistence, workflow
apps/web/                 React/Vite dashboard
packages/shared/          Zod schemas and shared types
packages/matching/        Filters, scoring, ranking, deduplication
packages/job-connectors/  Greenhouse and Lever adapters
docker-compose.yml        Optional PostgreSQL service
```

## Matching model

The deterministic score uses technical skills 35%, experience/relevance baseline 20%, role/title relevance 20%, location/work mode 15%, and salary fit 10%. Hard filters remove excluded employers, incompatible work modes, incompatible locations, and known salary mismatches. Unknown salary is not treated as an automatic mismatch. Each result includes reasons such as matched skills, role alignment, work-mode fit, and salary disclosure.

## API

| Method | Route | Auth | Purpose |
|---|---|---:|---|
| GET | `/health` | No | Health and counts |
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Sign in |
| GET | `/api/me` | Yes | User/profile/preferences readback |
| POST | `/api/resumes` | Yes | Multipart resume upload (`resume`) |
| GET/PUT | `/api/preferences` | Yes | Read/update preferences |
| GET | `/api/jobs/recommended` | Yes | Ranked recommendations |
| GET | `/api/jobs/:id` | Yes | Job detail |
| POST | `/api/jobs/:id/save` | Yes | Save job |
| POST | `/api/jobs/:id/dismiss` | Yes | Dismiss job |
| POST | `/api/jobs/:id/mark-applied` | Yes | Mark applied |
| POST | `/api/worker/run` | Yes | Recompute and prepare digest record |
| GET | `/api/notifications` | Yes | Notification readback |

Authenticated requests use `Authorization: Bearer <JWT>`.

## Run locally

Requirements: Node.js 20+ and npm 10+.

```bash
npm install
npm run dev
```

Web: http://localhost:5173
API: http://localhost:4000/health

The local JSON store is created automatically. When `DATABASE_URL` points to Neon PostgreSQL, the API creates an `app_state` table and persists the complete store in JSONB. Optional local PostgreSQL:

```bash
docker compose up -d postgres
cp .env.example .env
```

## Verification

```bash
npm run build
npm test
npm run typecheck
```

The verified E2E flow covers registration, authenticated profile readback, resume upload, recommendations, save action, worker execution, and notification readback.

## Security and source policy

Passwords are hashed, user routes require JWTs, resume uploads are limited and allowlisted, stored resume text is truncated, and connector application URLs must be HTTPS. Job descriptions are untrusted content. The system does not scrape or bypass LinkedIn, Indeed, Naukri, Foundit, CAPTCHAs, login walls, rate limits, or platform terms. Use authorized APIs, employer feeds, licensed feeds, or partnerships only.

## Free deployment plan

- Neon free PostgreSQL: create a project and use its pooled `DATABASE_URL` as the Render API `DATABASE_URL` secret.
- Render free web service: deploy the API from `render.yaml`, set `DATABASE_URL`, `JWT_SECRET`, and `WEB_ORIGIN`.
- Vercel Hobby: import this repository, use the committed `vercel.json`, and set `VITE_API_URL` to the deployed Render API URL.

Render free services can sleep when idle. Neon and Vercel free-tier limits, quotas, and policies apply and can change.

## Production status and roadmap

The live Render demo is available at `https://ai-job-agent-web-live.onrender.com` with the API at `https://ai-job-agent-api-live.onrender.com`. Recommendations are populated from authorized public Greenhouse employer boards (Airbnb, Stripe, Cloudflare, Figma, and Datadog), capped at 1,000 listings, and every application URL is HTTPS-only and filtered to exclude placeholder domains. Sources refresh at startup, every six hours by default, or through the authorized manual sync route. The API also includes production secret checks, AES-256-GCM resume encryption when `RESUME_ENCRYPTION_KEY` is configured, awaited PostgreSQL writes, readiness checks, rate limiting, worker authorization, and browser E2E coverage.

The Render Blueprint provisions PostgreSQL when the account permits a free database and sets `REQUIRE_DATABASE=true`. The currently running direct demo services leave that switch off and use ephemeral storage because this Render workspace has reached its free-database limit; configure a dedicated PostgreSQL/Neon `DATABASE_URL` and enable the switch before using real user data. Source refresh runs at API startup and is also available through the authorized `POST /api/worker/sync-jobs` route. Remaining provider-dependent work includes malware scanning, scheduled authorized source syncs, durable queue/leader-lock processing, timezone-aware SMTP digests with unsubscribe/idempotency, refresh-token rotation, audit logs, and backups.

Never commit `.env`, tokens, passwords, uploaded resumes, or `data/`.
