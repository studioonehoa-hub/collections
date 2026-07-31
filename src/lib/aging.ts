import type { SupabaseClient } from "@supabase/supabase-js";
import { parsePeriod } from "./format";

// 30-day buckets out to a year, then a catch-all — shared by the on-screen
// Aging Report and its CSV export so the two can never drift apart.
export const AGING_BUCKET_LABELS = [
  "1-30",
  "31-60",
  "61-90",
  "91-120",
  "121-150",
  "151-180",
  "181-210",
  "211-240",
  "241-270",
  "271-300",
  "301-330",
  "331-360",
  "360+",
] as const;

const BUCKET_DAYS = [30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360];

function bucketIndex(ageDays: number): number {
  if (ageDays <= 0) return 0;
  for (let i = 0; i < BUCKET_DAYS.length; i++) {
    if (ageDays <= BUCKET_DAYS[i]) return i;
  }
  return BUCKET_DAYS.length; // 360+
}

export type AgingRow = {
  unit_no: string;
  name: string;
  buckets: number[]; // one entry per AGING_BUCKET_LABELS, always this length
  total: number;
};

/**
 * Regular-dues aging, as of `asOf` (default: now). Unpaid per billing is
 * derived from payment_allocations — amount minus whatever's been allocated
 * to it, oldest-bill-first — the same source Outstanding and the Dashboard
 * use, so all three always reconcile: sum(bucketTotals) here equals the
 * sum of every billing's positive unpaid amount system-wide, which in turn
 * equals the sum of any single period's Outstanding balance restricted to
 * that period's billings. Levies are excluded entirely (no billings row
 * exists for them). Age is measured from the billing's period (first of
 * that month), since bills don't currently carry a separate due date.
 */
export async function buildAgingReport(supabase: SupabaseClient, asOf: Date = new Date()) {
  const { data: billings } = await supabase.from("billings").select("id, resident_id, period, amount");

  const billingIds = (billings ?? []).map((b) => b.id);
  const { data: allocations } = billingIds.length
    ? await supabase.from("payment_allocations").select("billing_id, amount").in("billing_id", billingIds)
    : { data: [] as { billing_id: string; amount: number }[] };
  const paidByBillingId = new Map<string, number>();
  for (const a of allocations ?? []) {
    paidByBillingId.set(a.billing_id, (paidByBillingId.get(a.billing_id) ?? 0) + Number(a.amount));
  }

  const unpaidBillings = (billings ?? [])
    .map((b) => ({ ...b, unpaid: Number(b.amount) - (paidByBillingId.get(b.id) ?? 0) }))
    .filter((b) => b.unpaid > 0.005);

  const residentIds = [...new Set(unpaidBillings.map((b) => b.resident_id))];
  const { data: directory } = residentIds.length
    ? await supabase.from("resident_report_directory").select("id, unit_no, name").in("id", residentIds)
    : { data: [] as { id: string; unit_no: string; name: string }[] };
  const directoryById = Object.fromEntries((directory ?? []).map((d) => [d.id, d]));

  const rowsByResident = new Map<string, AgingRow>();
  for (const b of unpaidBillings) {
    const d = directoryById[b.resident_id];
    if (!d) continue; // resident row not visible under this caller's RLS

    if (!rowsByResident.has(b.resident_id)) {
      rowsByResident.set(b.resident_id, {
        unit_no: d.unit_no,
        name: d.name,
        buckets: new Array(AGING_BUCKET_LABELS.length).fill(0),
        total: 0,
      });
    }
    const row = rowsByResident.get(b.resident_id)!;
    const billDate = parsePeriod(b.period);
    const ageDays = billDate ? Math.floor((asOf.getTime() - billDate.getTime()) / 86_400_000) : 0;
    const idx = bucketIndex(ageDays);
    row.buckets[idx] += b.unpaid;
    row.total += b.unpaid;
  }

  const rows = [...rowsByResident.values()].sort((a, b) => a.unit_no.localeCompare(b.unit_no));

  const bucketTotals = new Array(AGING_BUCKET_LABELS.length).fill(0);
  for (const r of rows) {
    r.buckets.forEach((v, i) => {
      bucketTotals[i] += v;
    });
  }
  const grandTotal = bucketTotals.reduce((sum, v) => sum + v, 0);

  return { rows, bucketTotals, grandTotal };
}
