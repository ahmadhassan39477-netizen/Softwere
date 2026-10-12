# Temp Empire

Automated self-service marketplace for temporary SMS OTP numbers and temp email, paid with account credits.

**Brand:** Temp Empire · **Reference flow:** [easyotps.com/services](https://easyotps.com/services)

## Quick start

```bash
npm install
cp .env.example .env
npm run db:setup
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

| Role | Email | Password |
|------|-------|----------|
| Demo | `demo@tempempire.com` | `demo1234` |
| Admin | `admin@tempempire.com` | `admin1234` |

## Stack

Next.js 15 · Tailwind · Prisma (SQLite local / Postgres-ready) · NextAuth · TanStack Query · Framer Motion · Lucide

Provider and payment secrets are stubbed behind env vars with mock adapters (`USE_MOCK_PROVIDERS=true`).

## Key routes

- `/services` — buy OTP (country / service / server / live inbox)
- `/temp-mail` · `/deposit` · `/orders` · `/api-docs` · `/admin` · `/settings`

Reseller REST: `/api/v1/countries|services|purchase|otp|cancel|balance`

## Docs

Project store (architecture, schema, implementation guide):

- `docs/architecture.md`
- `docs/database-schema.md`
- `docs/implementation-guide.md`
