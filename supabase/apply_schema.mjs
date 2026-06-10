// Apply supabase/schema.sql to your Supabase project.
//
// Usage (from the repo root):
//   set SUPABASE_URL=https://YOUR-PROJECT.supabase.co
//   set SUPABASE_SERVICE_ROLE_KEY=eyJ...   (Settings → API → service_role secret)
//   node supabase/apply_schema.mjs
//
// PowerShell:
//   $env:SUPABASE_URL = "https://YOUR-PROJECT.supabase.co"
//   $env:SUPABASE_SERVICE_ROLE_KEY = "eyJ..."
//   node supabase/apply_schema.mjs
//
// The service role key has admin privileges — keep it out of version control and out of
// any NEXT_PUBLIC_* env vars. This script is for one-time setup; you can also paste
// schema.sql straight into the Supabase SQL editor instead.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.");
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const sql = await readFile(join(here, "schema.sql"), "utf8");

const endpoint = `${url.replace(/\/$/, "")}/rest/v1/rpc/exec_sql`;
const headers = {
  "Content-Type": "application/json",
  apikey: key,
  Authorization: `Bearer ${key}`,
};

const res = await fetch(endpoint, {
  method: "POST",
  headers,
  body: JSON.stringify({ sql }),
});

if (res.ok) {
  console.log("Schema applied via exec_sql RPC.");
  process.exit(0);
}

// Fallback: PostgREST does not expose raw SQL by default. If the RPC isn't installed,
// run the bootstrap once in the SQL editor, then re-run this script:
//
//   create or replace function public.exec_sql(sql text) returns void
//     language plpgsql security definer as $$ begin execute sql; end; $$;
//   revoke all on function public.exec_sql(text) from public, anon, authenticated;
//
// Or — simpler — just paste schema.sql straight into the Supabase SQL editor.

const body = await res.text();
console.error(`HTTP ${res.status}: ${body}`);
console.error("");
console.error("Easiest path: open the Supabase dashboard → SQL Editor → paste supabase/schema.sql → Run.");
process.exit(1);
