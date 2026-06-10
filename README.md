# MFL Innovation Data Collector

Next.js dashboard for collecting CGIAR Multifunctional Landscapes (MFL) innovation data — Material UI design ([v3-mui/](v3-mui/)).

## Features

- **Landing page** explaining the MFL program objective
- **Login page** — Supabase Auth (email/password + magic link)
- **Excel-like data entry** (AG Grid Community) replicating the original `build_template_v3.py` template
- **Collapsible side panel** with three tabs:
  - **Import** — load CSV/Excel into the grid (auto-detects the `Data_Entry` sheet of the MFL template)
  - **Drafts** — your saved drafts; click to load & edit, trash icon to delete
  - **Sent** — submitted innovations; click for a read-only detail dialog
- **Country autocomplete** — `country` column suggests from the ISO country list as you type (`country-list`)
- **Save Draft** persists to Supabase `drafts` table (and localStorage as a fallback)
- **Submit** runs full ontology/taxonomy validation, then writes to `innovations`; red cells + tooltips show invalid values

## Setup

```powershell
cd v3-mui
Copy-Item .env.local.example .env.local   # fill in NEXT_PUBLIC_SUPABASE_URL + ANON_KEY
npm install
npm run dev    # http://localhost:3003
```

## Apply the database schema

Two ways:

**A. Supabase SQL editor (recommended, one click).** Open your Supabase project → SQL Editor → paste the contents of [supabase/schema.sql](supabase/schema.sql) → **Run**. The file is idempotent — safe to re-run after edits.

**B. From the command line.** Get the *service role* secret from Supabase → Settings → API and run:

```powershell
$env:SUPABASE_URL = "https://YOUR-PROJECT.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "eyJ..."   # service_role, NOT anon
node supabase/apply_schema.mjs
```

The script calls a `public.exec_sql` RPC. If it doesn't exist yet, the script prints a one-time bootstrap snippet to paste in the SQL editor — or just use method A.

## Two collection modes

Both modes write to the same `innovations` table with the same variable set, so the dashboards stay consistent:

- **Grid** — Excel-like bulk entry (AG Grid). Best for catalogue uploads.
- **Form** — guided 8-step wizard for a single innovation. The last step accepts curated raw-data files (CSV, Excel, TSV, TXT, Word, PDF, up to 5 MB each) stored in `innovations.extras.attachments`.

Toggle between them from the AppBar.
