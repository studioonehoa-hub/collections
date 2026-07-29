# Property Collection System — Scope

## Overview
Web app to record and track resident payments (regular dues + one-time levies). Admin-only at launch, designed so resident access can be added later without rework. Hosted on Vercel.

## Users & Roles
- **Super Admin (exactly one):** everything, plus the ONLY role that can view, copy, print, or export the resident database in aggregate (full list). Manages users and dues groups.
- **Admin:** manage residents (individual view/edit only), billing runs, levy, record payments, reports.
- **Encoder:** record payments and special payments only. Single-resident lookup only.
- **Report generator:** read-only — dashboard, ledgers, outstanding report, CSV export of *payment* data (never the resident list).
- **Resident (future):** view own history. Role-based auth from day one makes this an add-on, not a rework.

### Resident data privacy rule
Full resident list (aggregate view, export, print) is technically restricted to Super Admin — enforced server-side, not just hidden in UI. All other roles access residents one at a time via search (name or unit), and payment exports contain unit no + name only, no contact details.

## Data Model

### dues_groups
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | text | e.g. "Standard", "Penthouse", "Commercial" |
| monthly_amount | numeric | recurring amount for members |

### residents
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | text | |
| unit_no | text | unique |
| dues_group_id | uuid | FK → dues_groups; sets recurring amount |
| dues_override | numeric | nullable; per-resident amount, beats group |
| billing_contact_1 | text | name + channel (phone/email) for billing |
| billing_contact_2 | text | second primary billing contact |
| status | enum | active / inactive |

### billings (one row per resident per period)
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| resident_id | uuid | FK → residents |
| period | text | e.g. Jul 2026 |
| amount | numeric | from group or override at generation time |
| sent_via | enum | email / SMS / printed / hand-delivered |
| sent_at | date | nullable until dispatched |
| received_status | enum | pending / received / acknowledged |
| received_at | date | nullable |

### payments (regular dues)
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| resident_id | uuid | FK → residents |
| date | date | payment date |
| amount | numeric | |
| mode | enum | cash / cheque / bank transfer / UPI-online |
| received_by | enum | bank / admin office |
| period | text | optional: which month/quarter it covers |
| notes | text | optional |

### levies (one active at a time)
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | text | e.g. "Building repair fund 2026" |
| amount_per_unit | numeric | expected contribution |
| status | enum | active / closed; only one active |

### special_payments (payments against the levy)
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| resident_id | uuid | FK → residents |
| levy_id | uuid | FK → levies |
| amount | numeric | amount paid |
| date | date | date paid |
| mode / received_by | enum | same as payments |

### users
| Field | Type | Notes |
|---|---|---|
| id | uuid | PK |
| email | text | login |
| role | enum | super_admin / admin / encoder / report_generator / resident (future) |
| resident_id | uuid | nullable; links resident logins later |

## Features (v1)
1. Login (email + password), role-gated navigation, server-side enforcement.
2. Residents: add, edit, deactivate; assign dues group or override; 2 billing contacts. *(edit: admin+; aggregate list/export/print: super admin ONLY; others single lookup)*
3. Dues groups: create groups with recurring amounts. *(super admin, admin)*
4. Billing run: generate monthly bills for all active residents from group/override amounts; mark sent (channel + date) and received/acknowledged per unit. *(admin+)*
5. Record payment: pick resident → date, amount, mode, received by, period. *(admin, encoder)*
6. Record special payment against active levy. *(admin, encoder)*
7. Resident ledger: all payments for one unit, regular and special. *(all roles)*
8. Outstanding report: billed vs paid per unit, per month. *(admin+, report generator)*
9. Dashboard: collected this month, by mode, levy progress, billing dispatch status, recent entries. *(admin+, report generator)*
10. Export payment data to CSV/Excel (no contact details). *(admin+, report generator)*

## Formatting
Currency: PHP (₱), en-PH locale, dates as DD MMM YYYY.

## Out of Scope (v1)
Resident logins, online payment gateway, automated reminders, receipt file uploads, multi-property support. All are compatible with this design if added later.

## Tech Stack
- **Frontend/backend:** Next.js (single app, API routes)
- **Database + Auth:** Supabase (Postgres, Supabase Auth, row-level security enforces the super-admin-only aggregate rule at the DB level)
- **ORM:** Drizzle (or Supabase client directly)
- **Hosting:** Vercel Hobby tier
- **Repo:** GitHub (user's existing account), Vercel auto-deploys from main

## Build Phases
1. **Setup** — Next.js project, DB schema, admin auth. (~day 1)
2. **Core** — resident CRUD, payment + special payment entry, ledger view. (~days 2–3)
3. **Polish** — dashboard, CSV export, deploy to Vercel. (~day 4)

## Decisions Log
- Fixed monthly dues per unit — yes; outstanding report included in v1.
- Single active levy at a time.
- Currency: PHP, en-PH.
- Roles v1: super admin (one), admin, encoder, report generator. No resident login yet.
- Recurring billing amounts via dues groups, per-resident override allowed.
- Billing dispatch tracked: sent via + date, received/acknowledged + date.
- 2 primary billing contacts per resident.
- Aggregate resident data (list/copy/print/export) = super admin only, enforced server-side.
