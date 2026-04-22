# School ERP Frontend

This app now uses Supabase as the backend layer for authentication, complaint handling, AI attendance processing, and attendance persistence.

## Environment

Create a local `.env` file from `.env.example` and set:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Supabase Setup

1. Run the SQL in [supabase/migrations/20260421_supabase_backend.sql](/C:/Users/samee/projects/student-ERP/school-erp-system/supabase/migrations/20260421_supabase_backend.sql).
2. Create matching users in Supabase Auth.
3. Insert a row into `public.profiles` for each auth user.
4. Set the Edge Function secret:

```bash
supabase secrets set GEMINI_API_KEY=your_gemini_key
```

5. Deploy the AI attendance function:

```bash
supabase functions deploy ai-attendance
```

## Run

```bash
npm install
npm run dev
```

## Notes

- The legacy `backend/` services are no longer needed after the Supabase setup is in place.
- Many dashboard/demo views still use frontend sample data and Zustand stores, while the previously backend-backed flows now run through Supabase.
