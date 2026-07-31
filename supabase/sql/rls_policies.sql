-- ============================================================
-- Property Collection System — RLS policies, helper functions,
-- views, and the auth-provisioning trigger.
--
-- Run this AFTER the Drizzle-generated table migration (drizzle-kit
-- push/migrate creates the tables + enums from src/db/schema.ts;
-- this file adds everything Drizzle's schema DSL doesn't express).
--
-- Design summary:
--   - residents: aggregate SELECT is super_admin only (RLS-enforced,
--     not app-hidden). admin may insert/update but has no blanket
--     SELECT either — "individual view/edit only" per spec.
--   - resident_directory: a 3-column view (id, unit_no, status) — no
--     name, no contacts/dues data — readable by every role. Deliberately
--     excludes name so no role below super_admin can reconstruct a
--     name+unit roster via a plain SELECT; screens resolve a name only
--     after a specific unit is chosen, via resident_lookup().
--   - resident_lookup(query): SECURITY DEFINER function returning at
--     most one full resident record on an exact name/unit match — the
--     only way non-super-admin roles reach contact details, and it
--     structurally cannot return a list.
--   - generate_billing_run(period): SECURITY DEFINER function that is
--     the ONLY way billings rows get created (no direct INSERT policy).
--   - No DELETE is granted anywhere — "deactivate", not delete.
--   - payments/special_payments are insert-only from the app; corrections
--     go through void_payment()/void_special_payment() (SECURITY DEFINER,
--     admin+ only), which flips status to 'voided' and stamps who/when/why
--     rather than editing or deleting the original row.
--   - resident_report_directory: id/unit_no/name/status ONLY — no contacts,
--     no dues data — for the aggregate financial reports (Billing run,
--     Outstanding, Dashboard) that are explicitly spec'd to show unit+name
--     for admin/report_generator (mirrors "payment exports contain unit no
--     + name only, no contact details"). Deliberately excludes encoder, who
--     stays on the unit-only resident_directory — encoder's access is
--     single-lookup only, never an aggregate roster of any shape.
--   - dues_group_summary: per-group active member counts for the Billing
--     screen, without exposing which resident belongs to which group by
--     name — restricted to super_admin/admin (the only roles that manage
--     billing).
-- ============================================================

-- ---------- Helper: current caller's role ----------
-- SECURITY DEFINER so this can read public.users without triggering
-- that table's own RLS (which would otherwise recurse).
create or replace function public.current_user_role()
returns public.app_role
language sql
security definer
set search_path = public
stable
as $$
  select role from public.users where id = auth.uid()
$$;

-- ---------- Auth trigger: provision a public.users row (role = null)
-- whenever a new Supabase Auth user is created. Super Admin assigns the
-- actual role afterward via the Users screen. ----------
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, role) values (new.id, new.email, null);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ---------- Enable RLS on every table ----------
alter table public.users enable row level security;
alter table public.dues_groups enable row level security;
alter table public.residents enable row level security;
alter table public.billings enable row level security;
alter table public.payments enable row level security;
alter table public.levies enable row level security;
alter table public.special_payments enable row level security;

-- ============================================================
-- users
-- ============================================================
grant select, update on table public.users to authenticated;
-- No insert grant: rows are created solely by handle_new_auth_user()
-- (security definer), so direct inserts from the app are impossible.

create policy users_select_self_or_super on public.users
  for select to authenticated
  using (id = auth.uid() or public.current_user_role() = 'super_admin');

create policy users_update_super_admin on public.users
  for update to authenticated
  using (public.current_user_role() = 'super_admin')
  with check (public.current_user_role() = 'super_admin');

-- Minimal staff (not resident) directory — id/email/role only — so any
-- authenticated role can resolve "voided by" attribution on a payment even
-- when the voider was a different staff member. Low sensitivity (internal
-- admin/encoder/report_generator accounts, not resident data), needed for
-- the audit trail to actually be readable per-viewer, not just per-super_admin.
create or replace view public.staff_directory as
  select id, email, role from public.users;

grant select on public.staff_directory to authenticated;

-- ============================================================
-- dues_groups (name + amount only — not sensitive)
-- ============================================================
grant select, insert, update on table public.dues_groups to authenticated;

create policy dues_groups_select_any on public.dues_groups
  for select to authenticated
  using (public.current_user_role() is not null);

create policy dues_groups_insert_admin on public.dues_groups
  for insert to authenticated
  with check (public.current_user_role() in ('super_admin', 'admin'));

create policy dues_groups_update_admin on public.dues_groups
  for update to authenticated
  using (public.current_user_role() in ('super_admin', 'admin'))
  with check (public.current_user_role() in ('super_admin', 'admin'));

-- Case-insensitive, whitespace-insensitive uniqueness on name — "Test
-- Standard", "TEST Standard ", and " test standard" are all the same group.
-- The app also trims before insert/update; this index is the actual gate.
create unique index if not exists dues_groups_name_unique_ci
  on public.dues_groups (lower(trim(name)));

-- ============================================================
-- residents (sensitive master data: contacts, dues assignment)
-- ============================================================
grant select, insert, update on table public.residents to authenticated;

create policy residents_select_super_admin on public.residents
  for select to authenticated
  using (public.current_user_role() = 'super_admin');

create policy residents_insert_admin on public.residents
  for insert to authenticated
  with check (public.current_user_role() in ('super_admin', 'admin'));

create policy residents_update_admin on public.residents
  for update to authenticated
  using (public.current_user_role() in ('super_admin', 'admin'))
  with check (public.current_user_role() in ('super_admin', 'admin'));

-- Non-sensitive projection used for dropdowns/joins on payment, billing,
-- ledger, and outstanding-report screens by every role. Deliberately omits
-- `name`: exposing unit_no + name together to every role would let a
-- non-super-admin reconstruct the full name+unit roster via a plain
-- SELECT, which is exactly the aggregate list restriction they're not
-- supposed to have. Screens resolve a resident's name for display only
-- after a specific unit is selected, via resident_lookup() below. Views
-- run with the owner's RLS-bypass by default, which is exactly why this
-- view must never select any column beyond these three.
create or replace view public.resident_directory as
  select id, unit_no, status from public.residents;

grant select on public.resident_directory to authenticated;

-- Aggregate financial-report projection: id/unit_no/name/status ONLY — no
-- contacts, no dues_group_id, no override. Used by Billing run, Outstanding,
-- and Dashboard, which are spec'd to show unit+name (same allowance as a
-- payment CSV export) for super_admin/admin/report_generator. The WHERE
-- clause is the actual gate: encoder gets zero rows back, not an error,
-- consistent with how RLS denies SELECT everywhere else in this schema.
-- Never add another column here — that's the whole reason this view is
-- separate from the plain payments/billings/special_payments access those
-- roles already have.
create or replace view public.resident_report_directory as
  select id, unit_no, name, status
  from public.residents
  where public.current_user_role() in ('super_admin', 'admin', 'report_generator');

grant select on public.resident_report_directory to authenticated;

-- Per-group active member counts for the Billing screen. Exposes a count,
-- never which resident belongs to which group by name/unit.
create or replace view public.dues_group_summary as
  select
    g.id,
    g.name,
    g.monthly_amount,
    count(r.id) filter (where r.status = 'active') as member_count
  from public.dues_groups g
  left join public.residents r on r.dues_group_id = g.id
  where public.current_user_role() in ('super_admin', 'admin')
  group by g.id, g.name, g.monthly_amount;

grant select on public.dues_group_summary to authenticated;

-- Single-resident, case-insensitive exact-match lookup (name or unit_no) for
-- every role. Returns the full record (contacts included, as shown on the
-- Resident Lookup screen) but structurally never more than one row and
-- never a browsable list — this is what the "single lookup only" rule
-- actually rests on for admin/encoder/report_generator.
--
-- Case-insensitive via lower()=lower(), deliberately NOT via ILIKE: ILIKE
-- treats "_" and "%" in the query as wildcards, which would turn this into
-- an accidental partial-match/enumeration surface for any unit_no or name
-- containing those characters. lower()=lower() has no wildcard semantics
-- at all — still a true exact match, just case-insensitive.
create or replace function public.resident_lookup(p_query text)
returns setof public.residents
language sql
security definer
set search_path = public
stable
as $$
  select *
  from public.residents
  where public.current_user_role() is not null
    and (lower(unit_no) = lower(p_query) or lower(name) = lower(p_query))
  limit 1
$$;

revoke all on function public.resident_lookup(text) from public;
grant execute on function public.resident_lookup(text) to authenticated;

-- ============================================================
-- billings (one row per resident per period)
-- ============================================================
-- No insert grant/policy: rows are only ever created by
-- generate_billing_run() below.
grant select, update on table public.billings to authenticated;

create policy billings_select_admin_report on public.billings
  for select to authenticated
  using (public.current_user_role() in ('super_admin', 'admin', 'report_generator'));

create policy billings_update_admin on public.billings
  for update to authenticated
  using (public.current_user_role() in ('super_admin', 'admin'))
  with check (public.current_user_role() in ('super_admin', 'admin'));

-- Generates one billing row per active resident for p_period, using the
-- resident's dues_override if set, else their dues_group's monthly_amount.
-- SECURITY DEFINER so it can read the full residents table regardless of
-- the caller's row-level access — the role check inside is the real gate.
create or replace function public.generate_billing_run(p_period text)
returns setof public.billings
language sql
security definer
set search_path = public
as $$
  insert into public.billings (resident_id, period, amount)
  select r.id, p_period, coalesce(r.dues_override, g.monthly_amount)
  from public.residents r
  join public.dues_groups g on g.id = r.dues_group_id
  where r.status = 'active'
    and public.current_user_role() in ('super_admin', 'admin')
  on conflict (resident_id, period) do nothing
  returning *
$$;

revoke all on function public.generate_billing_run(text) from public;
grant execute on function public.generate_billing_run(text) to authenticated;

-- ============================================================
-- payments (regular dues)
-- ============================================================
grant select, insert on table public.payments to authenticated;

create policy payments_select_any on public.payments
  for select to authenticated
  using (public.current_user_role() is not null);

create policy payments_insert_admin_encoder on public.payments
  for insert to authenticated
  with check (public.current_user_role() in ('super_admin', 'admin', 'encoder'));

-- No UPDATE/DELETE policy for authenticated: the row is immutable. The
-- only way status/voided_* can change is through void_payment() below,
-- which runs as the function owner and needs no table grant to write.
-- Encoders can insert payments but cannot void them (admin+ only).
-- Callers computing totals/dashboard/outstanding figures MUST filter
-- status = 'active'; the ledger view should still display voided rows,
-- marked as such, since RLS intentionally does not hide them.
create or replace function public.void_payment(p_payment_id uuid, p_reason text)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.payments;
begin
  if public.current_user_role() not in ('super_admin', 'admin') then
    raise exception 'insufficient privilege to void a payment';
  end if;

  update public.payments
  set status = 'voided',
      voided_by = auth.uid(),
      voided_at = now(),
      void_reason = p_reason
  where id = p_payment_id
    and status = 'active'
  returning * into v_row;

  if v_row.id is null then
    raise exception 'payment % not found or already voided', p_payment_id;
  end if;

  return v_row;
end;
$$;

revoke all on function public.void_payment(uuid, text) from public;
grant execute on function public.void_payment(uuid, text) to authenticated;

-- ============================================================
-- levies (name + amount only — not sensitive)
-- ============================================================
grant select, insert, update on table public.levies to authenticated;

create policy levies_select_any on public.levies
  for select to authenticated
  using (public.current_user_role() is not null);

create policy levies_insert_admin on public.levies
  for insert to authenticated
  with check (public.current_user_role() in ('super_admin', 'admin'));

create policy levies_update_admin on public.levies
  for update to authenticated
  using (public.current_user_role() in ('super_admin', 'admin'))
  with check (public.current_user_role() in ('super_admin', 'admin'));

-- ============================================================
-- special_payments (payments against the active levy)
-- ============================================================
grant select, insert on table public.special_payments to authenticated;

create policy special_payments_select_any on public.special_payments
  for select to authenticated
  using (public.current_user_role() is not null);

create policy special_payments_insert_admin_encoder on public.special_payments
  for insert to authenticated
  with check (public.current_user_role() in ('super_admin', 'admin', 'encoder'));

-- Same immutable-row + void pattern as payments — see the comment above
-- void_payment().
create or replace function public.void_special_payment(p_special_payment_id uuid, p_reason text)
returns public.special_payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.special_payments;
begin
  if public.current_user_role() not in ('super_admin', 'admin') then
    raise exception 'insufficient privilege to void a special payment';
  end if;

  update public.special_payments
  set status = 'voided',
      voided_by = auth.uid(),
      voided_at = now(),
      void_reason = p_reason
  where id = p_special_payment_id
    and status = 'active'
  returning * into v_row;

  if v_row.id is null then
    raise exception 'special payment % not found or already voided', p_special_payment_id;
  end if;

  return v_row;
end;
$$;

revoke all on function public.void_special_payment(uuid, text) from public;
grant execute on function public.void_special_payment(uuid, text) to authenticated;
