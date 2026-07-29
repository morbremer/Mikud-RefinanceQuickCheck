# Mikud RefinanceQuickCheck

Standalone app hosting only בדיקת מחזור מהירה (RefinanceQuickCheck) — duplicated out of `Mikud-QuickCheck-work`, no Base44 dependency.

**Stack:** React + Vite frontend on Vercel, Supabase (Postgres + Edge Functions + Storage) backend, Gemini/OpenAI called directly (no LLM proxy).

## Setup

1. `npm install`
2. Create `.env.local`:
   ```
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
3. `npm run dev`

## Backend

- `supabase/functions/analyzeRefinanceDocument` — the refinance document analysis engine (Gemini + OpenAI fallback)
- `supabase/functions/chatWithMiko` — the מיקו chat widget backend (Gemini)
- `supabase/migrations/` — `refinance_leads` table + the private `documents` storage bucket + its anon insert/select policies

Deploy: `supabase functions deploy`, `supabase db push` (or apply migrations via the dashboard).

Required secrets: `GEMINI_API_KEY`. `OPENAI_API_KEY` is optional — only used as a fallback path in `analyzeRefinanceDocument`.
