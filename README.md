# Trade Operations Control Tower

An exception-first operations control tower for importers, sourcing teams,
and distributors managing purchase orders, supplier coordination, shipment
milestones, trade documents, landed cost, and exceptions.

This is not a generic admin dashboard, ERP clone, or CRM. It's a workflow
system built around one question: **what needs attention, and what should
happen next?** See `docs/plan.md` for the full product strategy and
architecture rationale, and `AGENTS.md` for day-to-day coding guardrails.

## Running it locally

Requires Node 20+ and a local PostgreSQL instance.

```bash
# 1. Create the database (adjust to your local Postgres setup)
createuser trade_ops --pwprompt --createdb   # password: trade_ops_dev, or edit .env
createdb trade_ops_control_tower --owner trade_ops

# 2. Configure environment
cp .env.example .env    # already points at the above by default

# 3. Install, migrate, seed
npm install
npx prisma migrate dev
npx prisma db seed

# 4. Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it redirects to
`/inbox`.

### Verification commands

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Architecture summary

- **Next.js (App Router) + TypeScript + Tailwind v4.** Server Components
  fetch data directly through Prisma; interactive surfaces (tabs, filters,
  approve/dismiss, task toggles) are client components calling Server
  Actions in `lib/actions/`.
- **UI primitives** in `components/ui/` are hand-authored in the shadcn/ui
  idiom (Radix + `class-variance-authority` + Tailwind) — see `docs/plan.md`
  for why they weren't pulled from the `shadcn` CLI registry in this
  environment.
- **Prisma 7 + PostgreSQL**, using the `prisma-client` generator and the
  `@prisma/adapter-pg` driver adapter (required by Prisma 7's SQL-provider
  workflow). Schema: `prisma/schema.prisma`.
- **Mock auth**: one organization, one signed-in user
  (`lib/session.ts`) — see `docs/plan.md` for the real-auth migration path.

Route map, full data model, and the AI-mocking strategy are documented in
`docs/plan.md`.

## Demo data

`prisma/seed.ts` seeds one organization — **Kestrel Import Co.** — with 5
suppliers of distinct risk profiles, 12 purchase orders, 10 shipments across
nearly every stage, and 9 exceptions covering every exception type at least
once (quantity mismatch, ETA delay, document mismatch/missing, cost
variance, supplier risk, customs hold, plus one resolved exception for the
analytics resolution-time metric). Every exception carries a linked task, an
AI recommendation with a real rationale, and activity events. Reseeding
(`npx prisma db seed`) clears and rebuilds all tables — safe to rerun.

## What's mocked

- **AI**: `ParsedField` confidence scores and `AiRecommendation`
  confidence/rationale are seeded, not produced by a live model call. The
  schema and UI are built exactly as they would be for a real pipeline —
  see `docs/plan.md`'s "AI mocking strategy" for the specific integration
  points.
- **Auth**: a single hardcoded user/organization via `lib/session.ts`.
- **Document parsing**: documents and their extracted fields are seed data,
  not the output of an actual OCR/extraction service.

## Highest-priority next steps

1. Wire real document extraction and swap seeded `ParsedField` rows for live
   output.
2. Wire an LLM call for `AiRecommendation` generation, using the exception +
   linked record as context.
3. Real authentication (the mock boundary is isolated specifically so this
   is a small change — see `lib/session.ts`).
4. Pick a Node-capable deploy target (Vercel, Render, etc.) — this app
   needs a running server for Prisma/Postgres and cannot be deployed to
   static-only hosting (e.g. GitHub Pages, which serves this repo's
   previous static portfolio site content in its git history).
