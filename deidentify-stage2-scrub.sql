-- ============================================================================
-- STAGE 2 SCRUB — the irreversible erase of names/emails from the cloud.
--
-- ⚠️ RUN THIS ONLY AT CUTOVER, and ONLY AFTER:
--    1. The new code is LIVE on production (families are on their /h/<code> links).
--    2. Your name-key backup file is saved safely on your Mac.
--
-- Running it before the new code is live will break the OLD site for families
-- (their email login depends on these columns).
--
-- Order matters: we DROP the audit triggers first, or the scrub UPDATE would
-- re-log every name into audit_log.old_data. Wrapped in a transaction so it's
-- all-or-nothing.
-- ============================================================================

begin;

-- 1. Stop PHI-change auditing so the scrub doesn't re-capture names.
--    (After de-identification there is no PHI in these tables to audit.)
drop trigger if exists audit_children    on public.children;
drop trigger if exists audit_assignments on public.assignments;

-- 2. Remove the identifiers from the live tables.
update public.children    set child_name = null, parent_email = null;
update public.assignments set child_name = null, parent_email = null;

-- 3. Scrub the historical audit log's PHI, but KEEP the non-PHI trail
--    (timestamp / action / table / actor = YOUR clinician email, not patient PHI).
--    This removes patient names + full-row snapshots while preserving "who did
--    what when". (Confirm this retention approach with your lawyer.)
update public.audit_log set child_name = null, old_data = null, new_data = null;

commit;

-- ── Verify afterwards (all three should return 0): ──────────────────────────
--   select count(*) from public.children    where child_name is not null or parent_email is not null;
--   select count(*) from public.assignments where child_name is not null or parent_email is not null;
--   select count(*) from public.audit_log    where child_name is not null or old_data is not null or new_data is not null;
