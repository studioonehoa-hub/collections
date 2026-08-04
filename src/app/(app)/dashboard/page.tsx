import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { currentPeriod, formatDate, formatPhp } from "@/lib/format";

function monthBounds(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const start = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-01`;
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start, end: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}` };
}

export default async function DashboardPage() {
  await requireRole(["super_admin", "admin", "report_generator"]);
  const supabase = await createClient();

  const period = currentPeriod();
  const { start: monthStart, end: monthEnd } = monthBounds(new Date());

  // Everything in this batch is independent — none of these queries depend
  // on another's result — so they go out as one parallel round trip instead
  // of up to six sequential ones (each sequential round trip pays the full
  // network latency to Supabase again).
  const [
    { data: directory },
    { data: monthPayments },
    { data: monthSpecial },
    { data: billings },
    { data: activeLevy },
    { data: recentPayments },
    { data: recentSpecial },
  ] = await Promise.all([
    supabase
      .from("resident_report_directory")
      .select("id, unit_no, name, status")
      .eq("status", "active")
      .returns<{ id: string; unit_no: string; name: string; status: string }[]>(),
    supabase
      .from("payments")
      .select("resident_id, date, amount, mode, received_by, period, status")
      .eq("status", "active")
      .gte("date", monthStart)
      .lte("date", monthEnd),
    supabase
      .from("special_payments")
      .select("resident_id, date, amount, mode, received_by, levy_id, status")
      .eq("status", "active")
      .gte("date", monthStart)
      .lte("date", monthEnd),
    supabase.from("billings").select("id, resident_id, amount").eq("period", period),
    supabase.from("levies").select("id, name, amount_per_unit").eq("status", "active").maybeSingle(),
    supabase
      .from("payments")
      .select("id, resident_id, date, amount, mode, received_by, status, created_at")
      .eq("status", "active")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("special_payments")
      .select("id, resident_id, date, amount, mode, received_by, status, created_at")
      .eq("status", "active")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  const nameByResident = Object.fromEntries((directory ?? []).map((d) => [d.id, d]));
  const totalActiveUnits = directory?.length ?? 0;

  const collectedThisMonth =
    (monthPayments ?? []).reduce((sum, p) => sum + Number(p.amount), 0) +
    (monthSpecial ?? []).reduce((sum, s) => sum + Number(s.amount), 0);

  const byMode = new Map<string, number>();
  for (const p of [...(monthPayments ?? []), ...(monthSpecial ?? [])]) {
    byMode.set(p.mode, (byMode.get(p.mode) ?? 0) + Number(p.amount));
  }

  const noBillingRun = (billings ?? []).length === 0;
  const expectedByResident = Object.fromEntries((billings ?? []).map((b) => [b.resident_id, Number(b.amount)]));

  // "Paid" per bill comes from payment_allocations, oldest-bill-first — same
  // source as the Outstanding and Aging reports, so this figure reconciles
  // with both rather than drifting from a payments.period tag match. Both
  // queries below only depend on the first batch (billingIds, activeLevy),
  // not on each other, so they still go out together rather than one after
  // the other.
  const billingIds = (billings ?? []).map((b) => b.id);
  const [{ data: periodAllocations }, { data: allSpecial }] = await Promise.all([
    billingIds.length
      ? supabase.from("payment_allocations").select("billing_id, amount").in("billing_id", billingIds)
      : Promise.resolve({ data: [] as { billing_id: string; amount: number }[] }),
    activeLevy
      ? supabase.from("special_payments").select("amount").eq("levy_id", activeLevy.id).eq("status", "active")
      : Promise.resolve({ data: [] as { amount: number }[] }),
  ]);
  const paidByBillingId = new Map<string, number>();
  for (const a of periodAllocations ?? []) {
    paidByBillingId.set(a.billing_id, (paidByBillingId.get(a.billing_id) ?? 0) + Number(a.amount));
  }
  const paidByResident = new Map<string, number>();
  for (const b of billings ?? []) {
    paidByResident.set(b.resident_id, paidByBillingId.get(b.id) ?? 0);
  }
  const billedUnitIds = Object.keys(expectedByResident);
  const paidUnitCount = billedUnitIds.filter(
    (id) => (paidByResident.get(id) ?? 0) >= expectedByResident[id] - 0.005,
  ).length;
  const outstandingThisMonth = billedUnitIds.reduce(
    (sum, id) => sum + Math.max(0, expectedByResident[id] - (paidByResident.get(id) ?? 0)),
    0,
  );
  const unpaidUnitCount = billedUnitIds.length - paidUnitCount;

  let levyLine: { name: string; collected: number; target: number; pct: number } | null = null;
  if (activeLevy) {
    const collected = (allSpecial ?? []).reduce((sum, s) => sum + Number(s.amount), 0);
    const target = Number(activeLevy.amount_per_unit) * totalActiveUnits;
    levyLine = {
      name: activeLevy.name,
      collected,
      target,
      pct: target > 0 ? Math.min(100, Math.round((collected / target) * 100)) : 0,
    };
  }

  // Strictly newest -> oldest across the whole combined list, not grouped by
  // date first: primary key is the full created_at timestamp (not just the
  // date, which only has day precision), with id as a final deterministic
  // tiebreaker for the vanishingly rare same-instant case.
  const recentEntries = [
    ...(recentPayments ?? []).map((p) => ({ ...p, type: "Monthly" as const })),
    ...(recentSpecial ?? []).map((p) => ({ ...p, type: "Levy" as const })),
  ]
    .sort((a, b) => {
      if (a.created_at !== b.created_at) return a.created_at < b.created_at ? 1 : -1;
      return a.id < b.id ? 1 : -1;
    })
    .slice(0, 10);

  return (
    <section>
      <h2 className="text-[17px] font-semibold text-gray-100">Dashboard</h2>
      <p className="text-gray-400 text-[12.5px] mb-4">{period} · all figures in PHP</p>

      {noBillingRun && (
        <div className="mb-4 bg-amber-900/30 border border-amber-800 text-amber-300 text-sm px-3 py-2">
          ⚠ No bills generated for {period}. &ldquo;Outstanding&rdquo; and &ldquo;units paid&rdquo; below read as
          zero because this period hasn&apos;t been billed yet — not because it&apos;s fully paid. Run the billing
          run on the Billing screen first.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-4 mb-4">
        <div
          className="relative overflow-hidden bg-gradient-to-br from-neutral-700/70 via-neutral-800/80 to-neutral-900/90 backdrop-blur-md border border-neutral-600/50 p-3.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
          title="Active (non-voided) regular dues + levy payments by the date actually received this calendar month — not scoped to a single billing period."
        >
          <div className="text-[11px] uppercase tracking-wide text-gray-400">Collected this month</div>
          <div className="text-[22px] font-bold mt-1">{formatPhp(collectedThisMonth)}</div>
          <div className="text-[11.5px] text-gray-400 mt-0.5">
            {paidUnitCount} of {billedUnitIds.length} units paid
          </div>
        </div>
        <div
          className="relative overflow-hidden bg-gradient-to-br from-neutral-700/70 via-neutral-800/80 to-neutral-900/90 backdrop-blur-md border border-neutral-600/50 p-3.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
          title={`Regular dues billed for ${period} minus amounts allocated to those bills (oldest-bill-first, so a payment tagged with a later period may still count). Excludes levies and other periods — see Unit Ledger for a resident's full cross-period balance.`}
        >
          <div className="text-[11px] uppercase tracking-wide text-gray-400">Outstanding ({period})</div>
          <div className="text-[22px] font-bold mt-1 text-red-400">{formatPhp(outstandingThisMonth)}</div>
          <div className="text-[11.5px] text-gray-400 mt-0.5">{unpaidUnitCount} units unpaid</div>
        </div>
        <div
          className="relative overflow-hidden bg-gradient-to-br from-neutral-700/70 via-neutral-800/80 to-neutral-900/90 backdrop-blur-md border border-neutral-600/50 p-3.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
          title="Total active special payments received against the currently active levy, all-time, vs. the per-unit amount times total active units. Separate from regular dues."
        >
          <div className="text-[11px] uppercase tracking-wide text-gray-400">
            {levyLine ? `Levy: ${levyLine.name}` : "Levy"}
          </div>
          {levyLine ? (
            <>
              <div className="text-[22px] font-bold mt-1">{formatPhp(levyLine.collected)}</div>
              <div className="text-[11.5px] text-gray-400 mt-0.5">of {formatPhp(levyLine.target)} target</div>
              <div className="h-2 bg-neutral-700 overflow-hidden mt-2">
                <div className="h-full bg-emerald-600" style={{ width: `${levyLine.pct}%` }} />
              </div>
            </>
          ) : (
            <div className="text-[13px] text-gray-400 mt-1">No active levy</div>
          )}
        </div>
        <div
          className="relative overflow-hidden bg-gradient-to-br from-neutral-700/70 via-neutral-800/80 to-neutral-900/90 backdrop-blur-md border border-neutral-600/50 p-3.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
          title="Breakdown of this calendar month's collected total (regular dues + levy payments combined) by payment mode."
        >
          <div className="text-[11px] uppercase tracking-wide text-gray-400">By mode ({period})</div>
          <div className="text-[13px] leading-7 mt-1">
            {byMode.size === 0 && <span className="text-gray-400">No collections yet</span>}
            {[...byMode.entries()].map(([mode, amount]) => (
              <div key={mode}>
                {mode.replace("_", " ")} {formatPhp(amount)}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-neutral-800 border border-neutral-700 p-4 mb-4">
        <h3 className="text-sm font-semibold mb-3">Recent entries</h3>
        <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400 border-b border-neutral-700">
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Unit</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Mode</th>
              <th className="px-3 py-2">Received</th>
              <th className="px-3 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {recentEntries.map((e) => (
              <tr key={e.id} className="border-b border-neutral-700 last:border-0">
                <td className="px-3 py-2">{formatDate(e.date)}</td>
                <td className="px-3 py-2">{nameByResident[e.resident_id]?.unit_no ?? "—"}</td>
                <td className="px-3 py-2">{nameByResident[e.resident_id]?.name ?? "—"}</td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-block text-[11px] px-2 py-0.5 ${
                      e.type === "Monthly" ? "bg-neutral-700 text-neutral-200" : "bg-amber-900/40 text-amber-300"
                    }`}
                  >
                    {e.type}
                  </span>
                </td>
                <td className="px-3 py-2">{e.mode}</td>
                <td className="px-3 py-2">{e.received_by}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatPhp(Number(e.amount))}</td>
              </tr>
            ))}
            {recentEntries.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-gray-400">
                  No entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      <Link
        href={`/dashboard/export?month=${monthStart.slice(0, 7)}`}
        className="border border-neutral-600 px-3 py-2 text-sm font-semibold inline-block"
      >
        ⬇ Export month to CSV
      </Link>
    </section>
  );
}
