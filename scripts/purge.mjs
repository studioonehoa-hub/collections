// Removes exactly what seed.mjs created and nothing else: residents whose
// unit_no starts with "TEST-" (billings/payments/special_payments cascade
// away with them via their FK ON DELETE CASCADE), then the "TEST "-prefixed
// levy and dues groups. Scoped strictly to that naming convention — never a
// blanket delete/truncate — so any real data (or the unrelated "Standard"
// group from earlier manual testing) is left untouched.
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

async function main() {
  const residents = await sql`
    delete from public.residents where unit_no like 'TEST-%' returning unit_no
  `;
  const levies = await sql`
    delete from public.levies where name like 'TEST %' returning name
  `;
  const groups = await sql`
    delete from public.dues_groups where name like 'TEST %' returning name
  `;

  console.log(`Deleted ${residents.length} residents (billings/payments/special_payments cascaded).`);
  console.log(`Deleted ${levies.length} levy: ${levies.map((l) => l.name).join(", ") || "none"}`);
  console.log(`Deleted ${groups.length} dues groups: ${groups.map((g) => g.name).join(", ") || "none"}`);

  await sql.end();
}

main().catch(async (err) => {
  console.error(err);
  await sql.end();
  process.exit(1);
});
