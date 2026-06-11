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
  keywords text,
  production_system text,
  challenge_category text,
  challenge_description text,
  indicators_measured text,
  years_tested text,                  -- deprecated; superseded by start/end year columns
  start_year_tested int,
  end_year_tested int,
  nb_actors_test_innovations int,
  actors_tested text,
  years_validated text,               -- deprecated; superseded by start/end year columns
  start_year_validated int,
  end_year_validated int,
  nb_actors_validation int,
  actors_validated text,
  scaling_readiness_validation text,
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
  sdg_secondary text,
  sdg_tertiary text,
  barriers_to_scaling text,
  success_factors text,
  general_comments text,
  form_feedback text,
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

-- ── Tester-feedback additions ──────────────────────────────────────────────
alter table public.innovations add column if not exists keywords                     text;
alter table public.innovations add column if not exists production_system            text;
alter table public.innovations add column if not exists indicators_measured          text;
alter table public.innovations add column if not exists years_validated              text;
alter table public.innovations add column if not exists nb_actors_validation         int;
alter table public.innovations add column if not exists actors_validated             text;
alter table public.innovations add column if not exists scaling_readiness_validation text;
alter table public.innovations add column if not exists sdg_secondary                text;
alter table public.innovations add column if not exists sdg_tertiary                 text;
alter table public.innovations add column if not exists barriers_to_scaling          text;
alter table public.innovations add column if not exists success_factors              text;
alter table public.innovations add column if not exists general_comments             text;
alter table public.innovations add column if not exists form_feedback                text;
alter table public.innovations add column if not exists start_year_tested            int;
alter table public.innovations add column if not exists end_year_tested              int;
alter table public.innovations add column if not exists start_year_validated         int;
alter table public.innovations add column if not exists end_year_validated           int;

-- years_tested was an integer count; testers asked for a year range like "1999-2002".
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='innovations'
               and column_name='years_tested'
               and data_type in ('integer','bigint','smallint')) then
    alter table public.innovations alter column years_tested type text using years_tested::text;
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

-- ── Profiles (auth metadata mirrored into a queryable table) ────────────────
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  first_name   text,
  last_name    text,
  phone_number text,
  email        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "read own profile"   on public.profiles;
drop policy if exists "update own profile" on public.profiles;
create policy "read own profile"   on public.profiles for select using (auth.uid() = id);
create policy "update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Populate `profiles` from `auth.users.raw_user_meta_data` whenever a new user signs up.
-- IMPORTANT: this runs inside the same transaction as the auth.users insert, so any
-- error here aborts the whole sign-up ("Database error saving new user"). The exception
-- guard guarantees a profile-insert failure can never block account creation — the cause
-- is written to the Postgres log instead (raise log) so it can be diagnosed after the fact.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, phone_number, email)
  values (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'phone_number',
    new.email
  )
  on conflict (id) do nothing;
  return new;
exception when others then
  raise log 'handle_new_user failed for % : % (%)', new.id, sqlerrm, sqlstate;
  return new;
end;
$$;

-- The trigger fires as `supabase_auth_admin` (the role that inserts into auth.users).
-- A SECURITY DEFINER function runs as its owner, but the caller still needs EXECUTE on it,
-- and the owner needs to be able to write the target table. Grant both explicitly.
grant usage on schema public to supabase_auth_admin;
grant insert, select on public.profiles to supabase_auth_admin;
grant execute on function public.handle_new_user() to supabase_auth_admin;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

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
