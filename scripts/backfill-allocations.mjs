// One-time backfill for payment_allocations: runs allocate_payment() for
// every existing active payment, oldest-first per resident (date asc, then
// created_at asc as a tiebreaker), so payments that were recorded before
// allocate_payment() existed correctly claim their resident's oldest unpaid
// bills first — same rule the app now applies automatically on every new
// payment. Safe to re-run: allocate_payment() only ever adds allocations
// for bills that are still unpaid at the time it runs, and the unique index
// on (payment_id, billing_id) prevents a double-allocation of the same pair.
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

async function main() {
  const payments = await sql`
    select id from public.payments
    where status = 'active'
    order by resident_id, date asc, created_at asc
  `;

  console.log(`Allocating ${payments.length} active payments...`);

  let done = 0;
  for (const p of payments) {
    await sql`select public.allocate_payment(${p.id})`;
    done += 1;
  }

  console.log(`Done. Allocated ${done} payments.`);
  await sql.end();
}

main().catch(async (err) => {
  console.error(err);
  await sql.end();
  process.exit(1);
});
