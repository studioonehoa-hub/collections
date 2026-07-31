# Koolector — Property Collections

HOA dues/collections app. Next.js (App Router) + Supabase (Postgres/Auth/RLS) + Drizzle, deployed on Vercel via GitHub auto-deploy on push to `main`.

- **Live URL:** https://collections-black.vercel.app
- **Supabase project ref:** `kudetasywaalqpyrbunr`
- **GitHub:** https://github.com/studioonehoa-hub/collections

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Requires a `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `DATABASE_URL` (direct Postgres connection, used only for schema/admin scripts — the app itself never uses a service-role key).

## Scripts

- `npm run db:generate` / `npm run db:push` — Drizzle schema migrations (tables/enums only; RLS policies, views, and functions live in `supabase/sql/rls_policies.sql` and are applied separately).
- `npm run db:seed` / `npm run db:purge` — seed/remove `TEST-`-prefixed fixture data, scoped strictly by naming convention so purge never touches real data.
- `npm run db:studio` — Drizzle Studio.

See `collections-test-guide.md` for the manual walkthrough/test guide.
