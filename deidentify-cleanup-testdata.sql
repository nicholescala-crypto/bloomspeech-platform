-- Remove the two TEST families we created while validating (Test Kid + the
-- test-insert family) so they don't clutter your real caseload. Safe to run
-- anytime. Identified by their known test access_codes.
delete from public.assignments
  where child_id in (
    select id from public.children
    where access_code in (
      'testfamily0000000000000000000000',
      'e53384866aca16a3b3eba04203e19e45'
    )
  );

delete from public.children
  where access_code in (
    'testfamily0000000000000000000000',
    'e53384866aca16a3b3eba04203e19e45'
  );
