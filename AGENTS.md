<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Trade Operations Control Tower

Exception-first operations control tower for inbound purchase orders and
shipments — importers, sourcing teams, distributors. Read `docs/plan.md`
first for the full product/architecture rationale; this file is the quick
reference for working in the codebase day to day.

## What this product is (and isn't)

It is a workflow coordination layer: detect exceptions early, centralize the
fragmented operational record, recommend next actions, keep an auditable
trail. It is **not** a mini-ERP, not a CRM, not a chatbot wrapper. Before
adding a feature, check `docs/plan.md`'s MVP boundaries — if it's warehouse
management, accounting, quoting, or a customer portal, it doesn't belong
here.

## Domain vocabulary

- **Exception** — the core unit of work. Has a `type` (quantity mismatch,
  ETA delay, document missing/mismatch, cost variance, supplier risk,
  customs hold), `severity`, and `status`.
- **ParsedField vs. AiRecommendation** — never conflate these. A
  `ParsedField` is an extracted fact with a confidence score. An
  `AiRecommendation` is a model-generated interpretation with a confidence
  score *and* a rationale, and requires human approval (`ApprovalDecision`)
  before it's "done." If you add a UI element that shows model output, make
  it visually obvious which one it is.
- **Shipment → PurchaseOrder → Supplier** — a Shipment does not have its own
  supplier field; it's reached via `shipment.purchaseOrder.supplier`. Don't
  add a denormalized `Shipment.supplierId` — it's a drift risk with no
  workflow need.
- **ActivityEvent** — every meaningful state change (exception detected,
  task assigned, recommendation approved, milestone completed) should write
  one. This is the audit trail; it's not optional set-dressing.

## Commands

```bash
npm run dev              # dev server (Turbopack)
npm run build             # production build
npm run lint               # eslint
npx tsc --noEmit            # typecheck
npx prisma migrate dev       # apply schema changes locally
npx prisma db seed            # reset + reseed demo data (safe to rerun; it clears tables first)
```

Local Postgres: `postgresql://trade_ops:trade_ops_dev@localhost:5432/trade_ops_control_tower`
(see `.env.example`). The Prisma client is generated to `lib/generated/prisma`
(gitignored) — run `npx prisma generate` after pulling schema changes if
imports start failing.

## UX guardrails

- Exception-first, not KPI-wall-first. The Inbox is the home screen for a
  reason.
- Every primary screen (Inbox, shipment detail, supplier detail) should
  answer: what is this, what needs attention, what happened, what happens
  next, who owns it. The shipment Overview tab is the reference
  implementation of this pattern.
- Severity/status color is restrained and semantic (see
  `components/ui/badge.tsx` variants: `critical/high/medium/low/success`) —
  don't introduce a new ad hoc color for a one-off badge.
- No decorative gradients, no marketing-site visual language, no fake AI
  side-panel with no workflow tie-in.

## Coding guardrails

- Server Components fetch directly via `lib/prisma.ts`; mutations go through
  `lib/actions/*.ts` Server Actions, not a REST/GraphQL layer.
- `lib/domain.ts` holds every enum→label and enum→badge-variant mapping —
  add new enum values there, don't inline label strings in components.
- `params` and `searchParams` in page props are `Promise`s in this Next.js
  version — `await` them.
- Auth is mocked via `lib/session.ts` (`getCurrentUser`/
  `getCurrentOrganization`). Every call site already treats these as async
  so real auth is a two-function swap — don't hardcode the seeded user id
  anywhere else.
- UI primitives in `components/ui/` are hand-authored shadcn/ui-equivalents
  (Radix + `cva` + `cn()`), not the npm package. Follow the same
  conventions (`data-slot` attributes, `cva` variants) when adding new
  primitives, and prefer `npx shadcn add` if network access to
  `ui.shadcn.com` is available in your environment.

## What not to do

- Don't add warehouse management, CRM, quoting, or accounting modules.
- Don't build a generic chat/assistant panel — AI surfaces must be tied to a
  specific exception or record.
- Don't add a denormalized relation the schema doesn't need (see Shipment →
  Supplier note above) — check `docs/plan.md`'s data model section first.
- Don't skip `ActivityEvent` writes on new mutations.

