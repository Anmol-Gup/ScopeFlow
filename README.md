# scopeflow

Turn client conversations into locked, versioned scope — and keep every
change to it under control.

An AI-assisted workspace for software agencies: capture a lead, log
requirements one at a time as the client shares them (AI can help clean up
the wording), review and approve them, lock an approved scope version,
generate a proposal, negotiate a quotation, and convert the accepted deal
into a project — all in one place.

Once a proposal or quotation is accepted by the client, it's permanently
locked — nothing can silently rewrite what they agreed to. Any scope added
afterward goes through a separate **Additional Scope** round: its own
proposal and quotation, priced and shared independently of the original.

## Features

**Pipeline**
- **Leads** — capture and track prospects through a simple status pipeline,
  each with one or more **Projects** underneath.
- **Requirements** — log requirements one at a time, typed or pasted, with
  an optional "Improve with AI" pass to clean up the wording, then review,
  edit, and approve each one by hand before anything downstream uses it.
- **Proposals & Quotations** — generate a proposal from the locked scope,
  share it with the client on a token-gated public link, track views, and
  negotiate — accept, reject, or request changes.
- **Dashboard** — pipeline value, what needs your attention, and recent
  activity across every lead and project.

**Scope integrity**
- **Versioned requirements** — "Lock approved scope" snapshots the current
  approved requirements as an immutable version; every proposal and
  quotation records exactly which version it was generated from.
- **Immutable accepted/rejected documents** — once a client decides, that
  version is permanent. Revising afterward — via a guided AI flow or a
  manual edit — always creates a new version instead of overwriting history.
- **Revise with AI** — describe what should change in plain language; the
  AI proposes a scope diff (what's added or removed) for review before
  anything is written to Requirements or a new proposal version is created.
- **Original vs Additional Scope** — new requirements approved after the
  original quotation is accepted get priced and shared as their own
  Additional Scope proposal/quotation, never touching the original.

**AI assistance** (bring your own key — OpenAI, Anthropic, or Gemini)
- Requirement wording cleanup
- Proposal drafting and guided revision
- Negotiation suggestions when a client pushes back on price
- Follow-up message drafts for a proposal that's gone quiet

**Other**
- **PDF export** for both proposals and quotations, from the agency side
  and via the client's public share link.
- **Workspace branding** — logo, accent color, and terms & conditions,
  overridable per document.
- **Services library** — reusable priced line items for building quotations
  faster.
- Email/password auth with verification and password reset.

## Getting started

```bash
cp .env.example .env      # fill in AUTH_SECRET / ENCRYPTION_KEY — see comments in the file
docker compose up -d      # local Postgres
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Stack

Next.js 16 (App Router) + React 19 + TypeScript, Prisma 7 + PostgreSQL,
Auth.js (next-auth v5), Tailwind CSS + shadcn/ui (Base UI primitives),
@react-pdf/renderer for PDF export. Bring-your-own-key AI providers
(OpenAI, Anthropic, Gemini) — keys are encrypted at rest and never sent
back to the browser after saving.
