# PL-II Performance Dashboard — Backend Starter

Baseline data comes from the supplied V8 dashboard and July 2026 source files. The supplied master has exactly 186 rows with status Aktif.

## Architecture
- Next.js App Router
- Supabase Postgres/Auth/Storage
- XLSX parser for Excel uploads
- Dashboard UI keeps V8 as the visual baseline while migration to live DB is staged

## Local setup
1. Install Node.js 20+.
2. Copy `.env.example` to `.env.local` and fill Supabase values.
3. Create a Supabase project.
4. Run `supabase/schema.sql` in Supabase SQL Editor.
5. Install packages: `npm install`.
6. Run: `npm run dev`.
7. Open `http://localhost:3000`.

## Current upload flow
`/admin` -> upload Excel -> `/api/upload` -> match against active master -> missing performance rows become zero/Nihil -> upsert by PL-II + period.

## Production next steps
1. Seed `pl2_master` from the 25 Aug 2026 file.
2. Seed July 2026 kinerja and formasi.
3. Add admin authentication and RLS for write operations.
4. Replace the V8 embedded `D` object with Supabase queries.
5. Add import validation preview + publish/rollback.
6. Deploy to Vercel and configure environment variables.

Never commit `.env.local` or service-role keys.
