-- ============================================================================
-- Stage 1 foundation for PHI de-identification (secret bookmark links)
-- Run this in the Supabase SQL editor. It is ADDITIVE and safe to run before
-- the Stage 2 migration: it does NOT touch or remove any names/emails yet.
--
-- What it does:
--   1. Gives every child a secret, unguessable access_code (their bookmark key).
--   2. Adds get_homework(code): a locked read function so a family's link
--      /h/<code> can fetch ONLY their de-identified homework, with no login and
--      without exposing any names/emails (the function never selects them).
--   3. Adds regenerate_access_code(child_id): lets the clinician rotate a code
--      if a link ever leaks.
-- ============================================================================

create extension if not exists pgcrypto;

-- 1. Secret per-child access code -------------------------------------------
-- 16 random bytes -> 32 hex chars (128 bits of entropy: not guessable/enumerable).
-- DEFAULT means new children created by the clinician get a code automatically.
alter table public.children
  add column if not exists access_code text
  default encode(gen_random_bytes(16), 'hex');

-- Backfill the existing children that predate the column.
update public.children
  set access_code = encode(gen_random_bytes(16), 'hex')
  where access_code is null;

-- Enforce uniqueness (one code = one family).
create unique index if not exists children_access_code_key
  on public.children (access_code);

-- The new clinician dashboard inserts children/assignments WITHOUT a name or
-- email, so those columns must allow null. (No-op if already nullable. This does
-- NOT delete existing values — that's the Stage 2 scrub.)
alter table public.children    alter column child_name   drop not null;
alter table public.children    alter column parent_email drop not null;
alter table public.assignments alter column child_name   drop not null;
alter table public.assignments alter column parent_email drop not null;

-- 2. Locked read for the parent bookmark link -------------------------------
-- SECURITY DEFINER so an anon (not-logged-in) parent can call it, but it only
-- returns de-identified CLINICAL columns, and only for the exact code given.
-- It never returns child_name / parent_email even while those columns still
-- exist (they get scrubbed in Stage 2). Direct table reads stay blocked by RLS.
create or replace function public.get_homework(p_code text)
returns table (
  id             uuid,
  target_sound   text,
  target_position text,
  difficulty     text,
  words          text[],
  clinician_note text,
  created_at     timestamptz
)
language sql
security definer
set search_path = public
as $$
  select a.id, a.target_sound, a.target_position, a.difficulty,
         a.words, a.clinician_note, a.created_at
  from public.assignments a
  join public.children c on c.id = a.child_id
  where c.access_code = p_code
  order by a.created_at desc;
$$;

-- Only allow calling it with a code; no blanket table access.
revoke all on function public.get_homework(text) from public;
grant execute on function public.get_homework(text) to anon, authenticated;

-- 3. Clinician can rotate a leaked link -------------------------------------
create or replace function public.regenerate_access_code(p_child_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  if not public.is_clinician() then
    raise exception 'not authorized';
  end if;
  v_code := encode(gen_random_bytes(16), 'hex');
  update public.children
    set access_code = v_code
    where id = p_child_id
      and lower(clinician_email) = lower(auth.jwt() ->> 'email');
  if not found then
    raise exception 'child not found for this clinician';
  end if;
  return v_code;
end;
$$;

revoke all on function public.regenerate_access_code(uuid) from public;
grant execute on function public.regenerate_access_code(uuid) to authenticated;

-- NOTE (for Stage 2): every assignment must have a valid child_id for
-- get_homework() to find it (it joins children->assignments on child_id).
-- Before scrubbing, verify none are orphaned:
--   select count(*) from public.assignments where child_id is null;
