import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { currentPeriod, formatPhp } from "@/lib/format";
import { getValidPeriods } from "@/lib/periods";

type Row = {
  unit_no: string;
  name: string;
  expected: number;
  paid: number;
};

export default async function OutstandingPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; filter?: string }>;
}) {
  await requireRole(["super_admin", "admin", "report_generator"]);
  const { period: periodParam, filter } = await searchParams;
  const period = periodParam?.trim() || currentPeriod();
  const supabase = await createClient();

  const validPeriods = await getValidPeriods(supabase);
  const periodOptions = validPeriods.includes(period) ? validPeriods : [...validPeriods, period];

  const { data: directory } = await supabase
    .from("resident_report_directory")
    .select("id, unit_no, name, status")
    .eq("status", "active")
    .returns<{ id: string; unit_no: string; name: string; status: string }[]>();

  const { data: billings } = await supabase
    .from("billings")
    .select("id, resident_id, amount")
    .eq("period", period);
  const noBillingRun = (billings ?? []).length === 0;
  const expectedByResident = Object.fromEntries((billings ?? []).map((b) => [b.resident_id, Number(b.amount)]));

  // "Paid" per bill comes from payment_allocations — the oldest-bill-first
  // ledger allocate_payment() maintains — not from matching payments.period,
  // since a payment tagged with a later period may have actually settled an
  // older unpaid bill. This is what keeps this report reconciled with the
  // Aging Report, which is built from the same allocation data.
  const billingIds = (billings ?? []).map((b) => b.id);
  const { data: allocations } = billingIds.length
    ? await supabase.from("payment_allocations").select("billing_id, amount").in("billing_id", billingIds)
    : { data: [] as { billing_id: string; amount: number }[] };
  const paidByBillingId = new Map<string, number>();
  for (const a of allocations ?? []) {
    paidByBillingId.set(a.billing_id, (paidByBillingId.get(a.billing_id) ?? 0) + Number(a.amount));
  }
  const paidByResident = new Map<string, number>();
  for (const b of billings ?? []) {
    paidByResident.set(b.resident_id, paidByBillingId.get(b.id) ?? 0);
  }

  let rows: Row[] = (directory ?? [])
    .filter((d) => expectedByResident[d.id] !== undefined)
    .map((d) => ({
      unit_no: d.unit_no,
      name: d.name,
      expected: expectedByResident[d.id],
      paid: paidByResident.get(d.id) ?? 0,
    }))
    .sort((a, b) => a.unit_no.localeCompare(b.unit_no));

  if (filter === "unpaid") {
    rows = rows.filter((r) => r.expected - r.paid > 0.005);
  }

  const totalExpected = rows.reduce((sum, r) => sum + r.expected, 0);
  const totalPaid = rows.reduce((sum, r) => sum + r.paid, 0);
  const totalBalance = totalExpected - totalPaid;

  return (
    <section>
      <h2 className="text-[17px] font-semibold text-gray-100">Outstanding Report</h2>
      <p className="text-gray-400 text-[12.5px] mb-4">Billed vs paid per unit, per month.</p>

      <form method="GET" className="flex gap-2 flex-wrap items-center mb-4">
        <select
          name="period"
          defaultValue={period}
          className="border border-neutral-600 px-3 py-2 text-sm text-gray-100 bg-neutral-950"
        >
          {periodOptions.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          name="filter"
          defaultValue={filter ?? "all"}
          className="max-w-[180px] border border-neutral-600 px-3 py-2 text-sm text-gray-100 bg-neutral-950"
        >
          <option value="all">All units</option>
          <option value="unpaid">Unpaid only</option>
        </select>
        <button type="submit" className="border border-neutral-600 px-3 py-2 text-sm font-semibold">
          View
        </button>
        <Link
          href={`/outstanding/export?period=${encodeURIComponent(period)}&filter=${filter ?? "all"}`}
          className="border border-neutral-600 px-3 py-2 text-sm font-semibold ml-auto"
        >
          ⬇ Export CSV
        </Link>
      </form>

      {noBillingRun && (
        <div className="mb-4 bg-amber-900/30 border border-amber-800 text-amber-300 text-sm px-3 py-2">
          ⚠ No bills generated for {period}. Every unit below reads as ₱0 expected — this period has not been
          billed, it is not paid up. Run the billing run on the Billing screen first.
        </div>
      )}

      <div className="bg-neutral-800 border border-neutral-700 overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400 border-b border-neutral-700">
              <th className="px-3 py-2">Unit</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2 text-right" title={`Regular dues billed for ${period} (this period only — not levies, not other periods).`}>
                Expected
              </th>
              <th className="px-3 py-2 text-right" title={`Amount allocated to ${period}'s bill, oldest-bill-first. A payment tagged with a later period may still count here if it was applied to this older bill.`}>
                Paid
              </th>
              <th className="px-3 py-2 text-right" title="Expected minus paid, for this period only.">
                Balance
              </th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const balance = r.expected - r.paid;
              const status = balance <= 0.005 ? "Paid" : r.paid > 0 ? "Partial" : "Unpaid";
              const badge =
                status === "Paid"
                  ? "bg-emerald-900/40 text-emerald-300"
                  : status === "Partial"
                    ? "bg-amber-900/40 text-amber-300"
                    : "bg-red-900/40 text-red-300";
              return (
                <tr key={r.unit_no} className="border-b border-neutral-700 last:border-0">
                  <td className="px-3 py-2">{r.unit_no}</td>
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatPhp(r.expected)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatPhp(r.paid)}</td>
                  <td className={`px-3 py-2 text-right tabular-nums ${balance > 0.005 ? "text-red-400" : ""}`}>
                    {formatPhp(balance)}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-block text-[11px] px-2 py-0.5 ${badge}`}>{status}</span>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-gray-400">
                  No billed units for {period}.
                </td>
              </tr>
            )}
            {rows.length > 0 && (
              <tr>
                <td colSpan={2} className="px-3 py-2 font-semibold">
                  Total ({rows.length} units)
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold">{formatPhp(totalExpected)}</td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold">{formatPhp(totalPaid)}</td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold text-red-400">
                  {formatPhp(totalBalance)}
                </td>
                <td className="px-3 py-2" />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-gray-400 text-[12px] mt-3">
        Figures reflect what was actually billed for {period} — units with no billing run for this period aren&apos;t
        listed. For a unit&apos;s full cross-period arrears history, use Unit Ledger.
      </p>
    </section>
  );
}
