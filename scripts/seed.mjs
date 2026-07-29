// Seeds ~20 obviously-fake test residents (unit_no prefixed "TEST-"), 3 dues
// groups and 1 levy (name prefixed "TEST "), billings across 3 periods, and
// payments covering every state the UI needs to render: fully paid, partial,
// unpaid, arrears carried over, all 4 payment modes, both received_by
// values, a voided payment, and dues overrides. Run `npm run db:purge`
// first if seed data already exists — this script refuses to run over it.
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

const UNIT_PREFIX = "TEST-";
const GROUP_PREFIX = "TEST ";
const LEVY_NAME = "TEST Repair Fund 2026";

const PERIODS = ["May 2026", "Jun 2026", "Jul 2026"];
const BILLING_SENT_AT = { "May 2026": "2026-05-01", "Jun 2026": "2026-06-01", "Jul 2026": "2026-07-01" };
const BILLING_RECEIVED_AT = { "May 2026": "2026-05-03", "Jun 2026": "2026-06-03", "Jul 2026": "2026-07-03" };
const PAY_DATE = { "May 2026": "2026-05-05", "Jun 2026": "2026-06-05", "Jul 2026": "2026-07-16" };
const SENT_VIA = ["email", "sms", "printed", "hand_delivered"];
const RECEIVED_STATUSES = ["pending", "received", "acknowledged"];
const MODES = ["cash", "cheque", "bank_transfer", "online"];
const RECEIVED_BY = ["bank", "admin_office"];

const GROUP_AMOUNT = { Standard: 1500.0, Penthouse: 1800.0, Commercial: 2400.0 };

// unit -> { name, group, override? }. Scenario for each unit is handled below
// in the payments section; this table only carries identity + dues setup.
const residentDefs = [
  { unit: "1A", group: "Standard" },
  { unit: "1B", group: "Standard" },
  { unit: "1C", group: "Standard" },
  { unit: "1D", group: "Standard" },
  { unit: "2A", group: "Standard" },
  { unit: "2B", group: "Standard", override: 1650.0 },
  { unit: "2C", group: "Standard", override: 2000.0 },
  { unit: "2D", group: "Standard" },
  { unit: "3A", group: "Penthouse" },
  { unit: "3B", group: "Penthouse" },
  { unit: "3C", group: "Standard" },
  { unit: "3D", group: "Standard" },
  { unit: "4A", group: "Commercial" },
  { unit: "4B", group: "Commercial" },
  { unit: "4C", group: "Standard" },
  { unit: "4D", group: "Standard" },
  { unit: "5A", group: "Standard" },
  { unit: "5B", group: "Standard" },
  { unit: "5C", group: "Penthouse" },
  { unit: "5D", group: "Commercial" },
];

function amountFor(def) {
  return def.override ?? GROUP_AMOUNT[def.group];
}

async function main() {
  const alreadySeeded = await sql`
    select unit_no from public.residents where unit_no like ${UNIT_PREFIX + "%"} limit 1
  `;
  if (alreadySeeded.length > 0) {
    console.error(
      `Seed data already present (found ${alreadySeeded[0].unit_no}). Run "npm run db:purge" first.`,
    );
    process.exit(1);
  }

  const groups = await sql`
    insert into public.dues_groups (name, monthly_amount)
    values
      (${GROUP_PREFIX + "Standard"}, ${GROUP_AMOUNT.Standard}),
      (${GROUP_PREFIX + "Penthouse"}, ${GROUP_AMOUNT.Penthouse}),
      (${GROUP_PREFIX + "Commercial"}, ${GROUP_AMOUNT.Commercial})
    returning id, name
  `;
  const groupId = Object.fromEntries(groups.map((g) => [g.name.slice(GROUP_PREFIX.length), g.id]));

  const [levy] = await sql`
    insert into public.levies (name, amount_per_unit, status)
    values (${LEVY_NAME}, 5000.00, 'active')
    returning id
  `;

  const residents = [];
  for (const def of residentDefs) {
    const unitNo = UNIT_PREFIX + def.unit;
    const [row] = await sql`
      insert into public.residents
        (name, unit_no, dues_group_id, dues_override, billing_contact_1, billing_contact_2)
      values (
        ${"Test Resident " + def.unit},
        ${unitNo},
        ${groupId[def.group]},
        ${def.override ?? null},
        ${"test+" + def.unit.toLowerCase() + "@example.test"},
        ${"0900 000 " + def.unit}
      )
      returning id
    `;
    residents.push({ ...def, id: row.id, unitNo });
  }
  const byUnit = Object.fromEntries(residents.map((r) => [r.unit, r]));

  // Billings: one row per resident per period, cycling sent_via/received_status for variety.
  let billingIdx = 0;
  for (const r of residents) {
    for (const period of PERIODS) {
      const receivedStatus = RECEIVED_STATUSES[billingIdx % RECEIVED_STATUSES.length];
      await sql`
        insert into public.billings (resident_id, period, amount, sent_via, sent_at, received_status, received_at)
        values (
          ${r.id}, ${period}, ${amountFor(r)},
          ${SENT_VIA[billingIdx % SENT_VIA.length]}, ${BILLING_SENT_AT[period]},
          ${receivedStatus}, ${receivedStatus === "pending" ? null : BILLING_RECEIVED_AT[period]}
        )
      `;
      billingIdx++;
    }
  }

  async function pay(unit, period, amount, mode, receivedBy) {
    const [row] = await sql`
      insert into public.payments (resident_id, date, amount, mode, received_by, period)
      values (${byUnit[unit].id}, ${PAY_DATE[period]}, ${amount}, ${mode}, ${receivedBy}, ${period})
      returning id
    `;
    return row.id;
  }

  // 1A: fully paid all 3 periods. The June payment gets voided below, so the
  // outstanding report should show June as unpaid despite this row existing.
  await pay("1A", "May 2026", amountFor(byUnit["1A"]), "bank_transfer", "bank");
  const junPaymentToVoid = await pay("1A", "Jun 2026", amountFor(byUnit["1A"]), "cash", "admin_office");
  await pay("1A", "Jul 2026", amountFor(byUnit["1A"]), "online", "bank");

  // 1B: full May/Jun, partial Jul.
  await pay("1B", "May 2026", amountFor(byUnit["1B"]), "cheque", "admin_office");
  await pay("1B", "Jun 2026", amountFor(byUnit["1B"]), "bank_transfer", "bank");
  await pay("1B", "Jul 2026", amountFor(byUnit["1B"]) / 2, "cheque", "admin_office");

  // 1C: unpaid all 3 periods — no payment rows at all.

  // 1D: arrears carried over — May unpaid, Jun + Jul paid.
  await pay("1D", "Jun 2026", amountFor(byUnit["1D"]), "cash", "bank");
  await pay("1D", "Jul 2026", amountFor(byUnit["1D"]), "online", "admin_office");

  // 2A: paid May + Jun, unpaid Jul (currently delinquent on the latest period).
  await pay("2A", "May 2026", amountFor(byUnit["2A"]), "bank_transfer", "bank");
  await pay("2A", "Jun 2026", amountFor(byUnit["2A"]), "cash", "admin_office");

  // 2B: dues-override resident, fully paid all 3 periods.
  for (const period of PERIODS) {
    await pay("2B", period, amountFor(byUnit["2B"]), "online", "bank");
  }

  // 2C: dues-override resident, full May/Jun, partial Jul.
  await pay("2C", "May 2026", amountFor(byUnit["2C"]), "cash", "admin_office");
  await pay("2C", "Jun 2026", amountFor(byUnit["2C"]), "cheque", "bank");
  await pay("2C", "Jul 2026", amountFor(byUnit["2C"]) - 500, "cash", "admin_office");

  // Everyone else: fully paid all 3 periods, cycling modes/received_by for bulk variety.
  const bulkUnits = ["2D", "3A", "3B", "3C", "3D", "4A", "4B", "4C", "4D", "5A", "5B", "5C", "5D"];
  let cycle = 0;
  for (const unit of bulkUnits) {
    for (const period of PERIODS) {
      await pay(unit, period, amountFor(byUnit[unit]), MODES[cycle % MODES.length], RECEIVED_BY[cycle % RECEIVED_BY.length]);
      cycle++;
    }
  }

  // Void the 1A June payment, attributing it to a test super_admin if one exists.
  const [voider] = await sql`
    select id from public.users where email = 'studioonehoa+testsuper@gmail.com'
  `;
  await sql`
    update public.payments
    set status = 'voided',
        voided_by = ${voider?.id ?? null},
        voided_at = now(),
        void_reason = 'Seed data: demonstrates void workflow (duplicate entry)'
    where id = ${junPaymentToVoid}
  `;

  // Special payments against the levy: a mix of full, partial, and untouched.
  async function specialPay(unit, amount, mode, receivedBy) {
    await sql`
      insert into public.special_payments (resident_id, levy_id, amount, date, mode, received_by)
      values (${byUnit[unit].id}, ${levy.id}, ${amount}, '2026-07-10', ${mode}, ${receivedBy})
    `;
  }
  await specialPay("1A", 5000.0, "cash", "admin_office");
  await specialPay("1B", 2500.0, "bank_transfer", "bank");
  await specialPay("2A", 5000.0, "online", "bank");
  await specialPay("2B", 5000.0, "cheque", "admin_office");
  await specialPay("3A", 2000.0, "cash", "admin_office");

  console.log(
    `Seeded ${residents.length} residents, 3 dues groups, 1 levy, ${residents.length * PERIODS.length} billings, and payments across all designed scenarios.`,
  );
  await sql.end();
}

main().catch(async (err) => {
  console.error(err);
  await sql.end();
  process.exit(1);
});
