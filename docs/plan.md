# Trade Operations Control Tower — Product & Implementation Plan

## Product strategy summary

Trade Operations Control Tower is an exception-first operations system for
inbound purchase order and shipment management. It is not a mini-ERP, not a
CRM, and not a chatbot — it is a workflow coordination layer that surfaces
what needs attention, centralizes the fragmented record (email, spreadsheets,
PDFs, broker updates) into one auditable operational record, and pairs every
exception with a human-approved recommendation.

The wedge is deliberately narrow: **inbound shipment / PO exception
management**, not broad procurement, accounting, or warehouse management.

## Target user

- **Primary**: Operations manager / trade coordinator at a small-to-mid-market
  importer, distributor, or sourcing-heavy business (North America, enough
  complexity to feel operational pain, not enterprise-scale).
- **Secondary**: sourcing managers, finance/operations controllers, warehouse
  leads, customs/broker coordination staff, leadership viewers.
- **Economic buyer**: head of operations, COO, or owner/operator.

## Core workflow

1. A document is parsed (mocked extraction) and facts are recorded as
   `ParsedField` rows with a confidence score, distinct from any
   interpretation.
2. An automation rule or the parsing step flags an anomaly, creating an
   `Exception` with severity, type, and links to the shipment/PO/supplier it
   concerns.
3. An `AiRecommendation` is attached to the exception — a specific next
   action with a rationale and confidence score, not a generic nudge.
4. A human (the operations manager) reviews the Inbox, opens the record,
   and either approves/dismisses the recommendation or works the linked
   `Task`.
5. Every step writes an `ActivityEvent`, so the shipment's timeline is a
   reconstructable audit trail, not tribal knowledge.

## MVP boundaries

**In scope**: PO/shipment records, milestone tracking, document parsing
surfaces, exception detection, recommendation generation with approve/dismiss,
task ownership, activity feed, landed-cost visibility (forecast vs. actual),
supplier performance/risk signals, a lightweight automation-rule surface, and
tight analytics.

**Explicitly out of scope**: full ERP accounting, warehouse management, CRM,
quoting, a customer-facing portal, a broad procurement suite, and a general
chat product. Also deliberately not modeled in v1 (see "Excluded from the
data model" below): message threads, generic file attachments (documents
already cover this), and notification preferences — each is real breadth
with no MVP-critical workflow depending on it yet.

## Architecture decisions

- **Next.js (App Router) + TypeScript + Tailwind v4.** Server Components do
  the data fetching directly against Prisma; the few interactive surfaces
  (tab switching, filters, approve/dismiss, task toggle) are isolated client
  components that call **Server Actions** (`lib/actions/*`) rather than a
  separate API layer.
- **UI primitives are hand-built, shadcn/ui-style** (Radix primitives +
  `class-variance-authority` + Tailwind), living in `components/ui/`. The
  `shadcn` CLI's registry fetch wasn't reachable from the build sandbox, so
  the primitives were authored directly in the same idiom (same component
  shapes, same `cn()` helper, same data-slot conventions) rather than
  skipped — this is a build-environment substitution, not a design
  compromise, and `npx shadcn add` will work normally against these files in
  a normal environment.
- **Prisma 7 + PostgreSQL**, with the `prisma-client` generator (not the
  legacy `prisma-client-js`) and the `@prisma/adapter-pg` driver adapter,
  which is required in Prisma 7's SQL-provider workflow. Schema lives in
  `prisma/schema.prisma`; the generated client is gitignored
  (`lib/generated/prisma`).
- **Mock auth boundary** (`lib/session.ts`): exactly one organization and one
  signed-in user (Sarah Nguyen, Operations Manager) for this MVP. Every call
  site already awaits `getCurrentUser()` / `getCurrentOrganization()`, so
  swapping in real auth (NextAuth, Clerk, etc.) means replacing the body of
  two functions, not touching every page.
- **Mock AI boundary**: there is no live model call in this MVP. Parsed
  fields, exception detection, and recommendations are seeded as if a
  extraction/reasoning pipeline produced them, with the exact same shape
  (confidence, rationale) a real pipeline would need to fill in later. See
  "AI mocking strategy" below.

## Route map

```
/inbox                    Exception queue — the operating center (default route)
/shipments                Shipment/PO list
/shipments/[id]           Record detail — overview, milestones, documents,
                           costs, activity, recommendations (tabs)
/suppliers                Supplier list
/suppliers/[id]           Supplier detail — risk signals, active exceptions,
                           recent POs, contacts
/documents                Cross-shipment document surface, filterable by
                           review status
/automations               Automation rule surface
/analytics                 Tight operational metrics
/settings                  Organization + team roster
```

## Data model summary

Facts and interpretations are modeled as separate tables by design
(`ParsedField` vs. `AiRecommendation`), per the product principle that
extracted data and model reasoning must never be visually or structurally
conflated.

- **Identity**: `Organization`, `User` (role-based: owner, ops manager, trade
  coordinator, finance, warehouse, viewer)
- **Suppliers**: `Supplier`, `SupplierContact`, `RiskSignal`
- **Commercial**: `PurchaseOrder`, `PurchaseOrderLineItem`
- **Logistics**: `Shipment`, `ShipmentMilestone`, `ShipmentContainer`
- **Documents & facts**: `Document`, `ParsedField` (confidence + verified
  flag)
- **Operations**: `Exception`, `Task`, `ActivityEvent`
- **Money**: `CostLine` (forecast / expected / confirmed status, forecast
  vs. actual amounts)
- **Automation & AI**: `AutomationRule`, `AiRecommendation` (confidence +
  rationale), `ApprovalDecision`

Full schema: `prisma/schema.prisma`.

## Seed strategy

`prisma/seed.ts` builds one coherent organization — **Kestrel Import Co.**, a
mid-market importer of home goods and consumer electronics accessories — with
5 suppliers of deliberately different risk profiles, 12 purchase orders, 10
shipments spanning nearly every stage and milestone state, and 9 exceptions
covering every `ExceptionType` at least once:

- Quantity mismatch (invoice vs. packing list, Silverline Electronics)
- ETA delay (Cat Lai port congestion, Vantage Textiles)
- Document mismatch (container count, Vantage Textiles)
- Cost variance (brokerage 31% over forecast, Huaxin Metal Works)
- Supplier risk (reliability trending down, Silverline Electronics)
- Document missing — inspection report (Novara Furnishings)
- Document missing — Certificate of Origin, critical (Delta Cookware)
- Customs hold — CBP random exam (Huaxin Metal Works)
- Resolved document exception (historical record, for analytics'
  resolution-time metric)

Every exception carries a linked task, an AI recommendation with a real
rationale, and activity events, so every screen in the product tells the same
consistent story rather than showing disconnected placeholder rows.

## AI mocking strategy

`ParsedField.confidence` and `AiRecommendation.{confidence,rationale}` are
seeded values, not live inferences — but the schema, the UI, and the
approve/dismiss workflow are built exactly as they would be if a real
extraction/reasoning service populated them. To wire in a real model later:

1. Replace the seed-time field population with a call to a document
   extraction service, writing `ParsedField` rows with real confidence
   scores.
2. Replace exception-detection seed data with an automation-rule evaluator
   (the `AutomationRule.condition` strings are already written as literal
   evaluable expressions) that creates `Exception` rows.
3. Replace recommendation seed data with a call to an LLM given the
   exception + linked record context, writing `AiRecommendation` with a
   real rationale.

No UI changes are required for any of the three steps — `lib/actions/*` and
the page queries are already written against the final shape.

## GitHub Pages static-export build

A separate build target exists purely to give this project a public link
without requiring any hosting account: `scripts/static-export.sh` produces
a fully static `output: "export"` build, deployed by
`.github/workflows/deploy-pages.yml`. This is explicitly a demo stand-in,
not a second deployment target for the real product — see README "Live
demo (GitHub Pages)" and "What's mocked" for what it trades away (no
server, no live database, mutations are local-only).

Two Next.js constraints — confirmed by directly testing against this
Next.js version, not assumed from general docs — shaped how this works:

1. **`dynamic` / `dynamicParams` route-segment config must be a literal**,
   not a computed expression — `export const dynamic = cond ? "a" : "b"`
   fails the build with "Next.js can't recognize the exported `dynamic`
   field." So the committed source stays dynamic-mode-only (literal
   `"force-dynamic"` in the workspace layout; `dynamicParams` unset,
   defaulting to `true`, on the two `[id]` routes), and the static build
   uses `sed` to strip/inject the literals it needs before building.
2. **Server Actions are entirely unsupported with `output: "export"`,
   even if unreachable at runtime** — a `"use server"` file behind a dead
   `if (false)` branch, or only ever dynamically `import()`-ed, still fails
   the build with "Server Actions are not supported with static export."
   Detection is structural (is the file part of the compiled graph at all),
   not reachability-based. So `lib/actions/recommendations.ts` and
   `lib/actions/tasks.ts` are physically swapped for
   `*.static.ts` stand-ins (no `"use server"`, no Prisma import) before the
   static build and restored from a plain file backup afterward — not a
   `git checkout`, which would silently discard uncommitted work on those
   files if the build ran before a commit.

`lib/repo.ts` and `lib/session.ts` are the only files that branch on
`STATIC_EXPORT` at runtime (safe, since neither is a route-segment config
export or a Server Action) — every page calls these instead of Prisma
directly, so the two builds render identical pages from different data
sources. `RecommendationCard` and `TaskRow` hold local optimistic state
regardless of build mode; on the real app it converges with the
server-confirmed value after revalidation, and on the static build it's
what actually drives the UI, since there's nothing to revalidate against.

## Future phases

- Real authentication and multi-organization support (the mock boundary is
  isolated specifically so this is a two-function change).
- Live document extraction and LLM-generated recommendations (see above).
- Inbound integrations: freight forwarder / carrier tracking APIs, customs
  broker status feeds, supplier email ingestion.
- Notification preferences and digest emails.
- Message threads per exception (structured supplier/broker correspondence)
  once outreach automation moves beyond the current rule concept.
