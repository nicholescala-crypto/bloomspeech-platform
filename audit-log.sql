-- ============================================================================
-- Bloom Therapy — PHI change audit log
-- Records every INSERT / UPDATE / DELETE on children & assignments:
-- who did it (from their signed JWT), when, and the before/after data.
-- Run in the Supabase SQL Editor of the PRODUCTION project (senvryhgtgnridbwzxjg).
-- ============================================================================

-- 1. Append-only audit table.
create table if not exists public.audit_log (
  id           bigint generated always as identity primary key,
  occurred_at  timestamptz not null default now(),
  actor_email  text,        -- signed-in user's email (from JWT), null for system
  actor_role   text,        -- clinician | parent | system
  action       text not null,   -- INSERT | UPDATE | DELETE
  table_name   text not null,
  row_id       uuid,
  child_name   text,        -- denormalized so the log is readable at a glance
  old_data     jsonb,       -- row before change (UPDATE/DELETE)
  new_data     jsonb        -- row after change (INSERT/UPDATE)
);

-- 2. Protect it. RLS on + NO policies = the anon/authenticated (client) keys
--    cannot read, insert, edit, or delete audit rows. Only the SECURITY DEFINER
--    trigger below writes to it; you read it as admin in the SQL Editor.
alter table public.audit_log enable row level security;

-- 3. Trigger function — captures who/what/when. Generic: works for both tables.
create or replace function public.log_phi_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) else null end;
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) else null end;
  v_email text := auth.jwt() ->> 'email';
begin
  insert into public.audit_log(
    actor_email, actor_role, action, table_name, row_id, child_name, old_data, new_data
  ) values (
    v_email,
    case when public.is_clinician() then 'clinician'
         when v_email is not null   then 'parent'
         else 'system' end,
    tg_op,
    tg_table_name,
    coalesce(v_new->>'id', v_old->>'id')::uuid,
    coalesce(v_new->>'child_name', v_old->>'child_name'),
    v_old,
    v_new
  );
  return coalesce(new, old);
end;
$$;

-- 4. Attach to the PHI tables.
drop trigger if exists audit_children on public.children;
create trigger audit_children
  after insert or update or delete on public.children
  for each row execute function public.log_phi_change();

drop trigger if exists audit_assignments on public.assignments;
create trigger audit_assignments
  after insert or update or delete on public.assignments
  for each row execute function public.log_phi_change();

-- 5. Access (read) logging. Reads don't fire triggers, so the app calls this
--    RPC when a dashboard loads PHI. Identity is stamped server-side from the
--    JWT (client can't spoof who viewed). SECURITY DEFINER so it can write to
--    the protected audit_log; execute granted to authenticated users.
create or replace function public.log_phi_view(
  p_table      text,
  p_row_id     uuid default null,
  p_child_name text default null,
  p_context    text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := auth.jwt() ->> 'email';
begin
  if v_email is null then
    return;  -- only log real, authenticated views
  end if;
  insert into public.audit_log(
    actor_email, actor_role, action, table_name, row_id, child_name, new_data
  ) values (
    v_email,
    case when public.is_clinician() then 'clinician' else 'parent' end,
    'VIEW',
    p_table,
    p_row_id,
    p_child_name,
    case when p_context is not null then jsonb_build_object('context', p_context) else null end
  );
end;
$$;

grant execute on function public.log_phi_view(text, uuid, text, text) to authenticated;

-- ── To review the log later (run as admin in the SQL Editor): ────────────────
--   select occurred_at, actor_email, actor_role, action, table_name, child_name
--   from public.audit_log order by occurred_at desc limit 100;
