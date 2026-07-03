-- ============================================================================
-- Bloom Therapy — Row Level Security setup
-- Run this in the Supabase SQL Editor AFTER magic-link auth is deployed.
-- Order matters: run top to bottom.
-- ============================================================================

-- ── 0. Remove any pre-existing policies on the PHI tables ───────────────────
-- These tables shipped with a permissive "allow everyone" policy that let the
-- public anon key read all rows. Drop every existing policy so only the
-- restrictive ones defined below remain.
do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename in ('children', 'assignments')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- ── 1. Clinician allowlist ──────────────────────────────────────────────────
-- A user is a clinician ONLY if their email is in this table. This is what
-- separates a clinician from a parent. Parents are never listed here.
create table if not exists public.clinicians (
  email      text primary key,
  full_name  text,
  created_at timestamptz not null default now()
);

alter table public.clinicians enable row level security;

-- A signed-in user may read ONLY their own row (to confirm they're a clinician).
-- They cannot list or read anyone else's row.
drop policy if exists "user_reads_own_clinician_row" on public.clinicians;
create policy "user_reads_own_clinician_row" on public.clinicians
  for select to authenticated
  using ( lower(email) = lower(auth.jwt() ->> 'email') );

-- Seed yourself as the first clinician. Add more rows here as you hire.
insert into public.clinicians (email, full_name)
values ('nicholescala@me.com', 'Nichole Scala')
on conflict (email) do nothing;

-- ── 2. Helper: is the current user a clinician? ─────────────────────────────
-- security definer lets it read the allowlist regardless of RLS.
create or replace function public.is_clinician()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.clinicians c
    where lower(c.email) = lower(auth.jwt() ->> 'email')
  );
$$;

-- ── 3. children table policies ──────────────────────────────────────────────
alter table public.children enable row level security;

-- Parent can read only their own child's row.
drop policy if exists "parent_reads_own_child" on public.children;
create policy "parent_reads_own_child" on public.children
  for select to authenticated
  using ( lower(parent_email) = lower(auth.jwt() ->> 'email') );

-- Clinician can read only children on their caseload.
drop policy if exists "clinician_reads_caseload" on public.children;
create policy "clinician_reads_caseload" on public.children
  for select to authenticated
  using ( lower(clinician_email) = lower(auth.jwt() ->> 'email') );

-- Only a real clinician may add a child, and only assigned to themselves.
drop policy if exists "clinician_inserts_own_child" on public.children;
create policy "clinician_inserts_own_child" on public.children
  for insert to authenticated
  with check (
    public.is_clinician()
    and lower(clinician_email) = lower(auth.jwt() ->> 'email')
  );

-- Clinician may edit / remove only their own children.
drop policy if exists "clinician_updates_own_child" on public.children;
create policy "clinician_updates_own_child" on public.children
  for update to authenticated
  using ( lower(clinician_email) = lower(auth.jwt() ->> 'email') )
  with check ( lower(clinician_email) = lower(auth.jwt() ->> 'email') );

drop policy if exists "clinician_deletes_own_child" on public.children;
create policy "clinician_deletes_own_child" on public.children
  for delete to authenticated
  using ( lower(clinician_email) = lower(auth.jwt() ->> 'email') );

-- ── 4. assignments table policies ───────────────────────────────────────────
alter table public.assignments enable row level security;

drop policy if exists "parent_reads_own_assignments" on public.assignments;
create policy "parent_reads_own_assignments" on public.assignments
  for select to authenticated
  using ( lower(parent_email) = lower(auth.jwt() ->> 'email') );

drop policy if exists "clinician_reads_own_assignments" on public.assignments;
create policy "clinician_reads_own_assignments" on public.assignments
  for select to authenticated
  using ( lower(clinician_email) = lower(auth.jwt() ->> 'email') );

drop policy if exists "clinician_inserts_own_assignments" on public.assignments;
create policy "clinician_inserts_own_assignments" on public.assignments
  for insert to authenticated
  with check (
    public.is_clinician()
    and lower(clinician_email) = lower(auth.jwt() ->> 'email')
  );

drop policy if exists "clinician_updates_own_assignments" on public.assignments;
create policy "clinician_updates_own_assignments" on public.assignments
  for update to authenticated
  using ( lower(clinician_email) = lower(auth.jwt() ->> 'email') )
  with check ( lower(clinician_email) = lower(auth.jwt() ->> 'email') );

drop policy if exists "clinician_deletes_own_assignments" on public.assignments;
create policy "clinician_deletes_own_assignments" on public.assignments
  for delete to authenticated
  using ( lower(clinician_email) = lower(auth.jwt() ->> 'email') );

-- ── 5. Verify ───────────────────────────────────────────────────────────────
-- Re-run the audit query afterward; every PHI table should show rls_enabled = true
-- with policy_count > 0:
--   select t.tablename, t.rowsecurity as rls_enabled, count(p.policyname) as policy_count
--   from pg_tables t
--   left join pg_policies p on p.schemaname=t.schemaname and p.tablename=t.tablename
--   where t.schemaname='public' group by t.tablename, t.rowsecurity order by t.tablename;
