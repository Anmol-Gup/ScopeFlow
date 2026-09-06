# scopeflow

Turn client conversations into project-ready scope.

An AI-assisted sales & discovery workspace: capture a lead, run discovery,
extract requirements with AI (human-reviewed before anything is sent),
generate a proposal, negotiate a quotation, and convert the won deal into a
project — all in one place.

## Getting started

```bash
docker compose up -d      # local Postgres
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Stack

Next.js (App Router) + TypeScript, Prisma + PostgreSQL, Auth.js, Tailwind CSS
+ shadcn/ui (Base UI primitives). Bring-your-own-key AI providers (OpenAI,
Anthropic, Gemini) — keys are encrypted at rest and never sent back to the
browser after saving.
