-- MFL Innovation Data Collector — Supabase schema
-- Run once in the Supabase SQL editor.

create extension if not exists "pgcrypto";

create table if not exists public.innovations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  submitted_at timestamptz not null default now(),

  innovation_id text not null,
  region text not null,
  country text not null,
  site_name text,
  climate_class text,
  latitude double precision,
  longitude double precision,
  innovation_description text not null,
  innovation_type text not null,
  innovation_scale text,
  scaling_readiness_level text,
  challenge_category text,
  challenge_description text,
  years_tested int,
  nb_actors_test_innovations int,
  actors_tested text,
  data_collected text,
  data_repository_url text,
  innovation_description_url text,
  link_another_aow text,
  focal_point_name text,
  focal_point_email text,
  lead_organisation text,
  co_developers text,
  implementing_partners text,
  sdg text,
  cgiar_food_security text,
  cgiar_improved_livelihoods text,
  cgiar_gender_equality text,
  cgiar_environment_biodiversity text,
  cgiar_climate_change text,
  extras jsonb
);

-- Idempotent for existing databases that pre-date `extras`:
alter table public.innovations add column if not exists extras jsonb;

-- Migrations for already-deployed schemas:
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='innovations'
               and column_name='nb_farmers_test_innovations')
  and not exists (select 1 from information_schema.columns
                  where table_schema='public' and table_name='innovations'
                    and column_name='nb_actors_test_innovations') then
    alter table public.innovations rename column nb_farmers_test_innovations to nb_actors_test_innovations;
  end if;
end $$;
alter table public.innovations add column if not exists actors_tested      text;
alter table public.innovations add column if not exists focal_point_email  text;

do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='innovations'
               and column_name='innovation_name')
  and not exists (select 1 from information_schema.columns
                  where table_schema='public' and table_name='innovations'
                    and column_name='innovation_description') then
    alter table public.innovations rename column innovation_name to innovation_description;
  end if;
end $$;

create table if not exists public.drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null default 'Untitled draft',
  rows jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.innovations enable row level security;
alter table public.drafts      enable row level security;

drop policy if exists "read own innovations"   on public.innovations;
drop policy if exists "insert own innovations" on public.innovations;
drop policy if exists "update own innovations" on public.innovations;
create policy "read own innovations"   on public.innovations for select using (auth.uid() = user_id);
create policy "insert own innovations" on public.innovations for insert with check (auth.uid() = user_id);
create policy "update own innovations" on public.innovations for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "read own drafts"   on public.drafts for select using (auth.uid() = user_id);
create policy "write own drafts"  on public.drafts for insert with check (auth.uid() = user_id);
create policy "update own drafts" on public.drafts for update using (auth.uid() = user_id);
create policy "delete own drafts" on public.drafts for delete using (auth.uid() = user_id);

-- Storage policies for the `mfl` bucket.
-- Paths are stored as `<user_id>/<innovation_id>/<timestamp>_<filename>`,
-- so the first folder segment is always the owner.
drop policy if exists "mfl read own"   on storage.objects;
drop policy if exists "mfl upload own" on storage.objects;
drop policy if exists "mfl delete own" on storage.objects;

create policy "mfl read own" on storage.objects for select to authenticated using (
  bucket_id = 'mfl' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "mfl upload own" on storage.objects for insert to authenticated with check (
  bucket_id = 'mfl' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "mfl delete own" on storage.objects for delete to authenticated using (
  bucket_id = 'mfl' and (storage.foldername(name))[1] = auth.uid()::text
);
