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

  const { data: directory } = await supabase
    .from("resident_report_directory")
    .select("id, unit_no, name, status")
    .eq("status", "active")
    .returns<{ id: string; unit_no: string; name: string; status: string }[]>();
  const nameByResident = Object.fromEntries((directory ?? []).map((d) => [d.id, d]));
  const totalActiveUnits = directory?.length ?? 0;

  const [{ data: monthPayments }, { data: monthSpecial }, { data: billings }, { data: periodPayments }, { data: activeLevy }] =
    await Promise.all([
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
      supabase.from("billings").select("resident_id, amount").eq("period", period),
      supabase.from("payments").select("resident_id, amount").eq("period", period).eq("status", "active"),
      supabase.from("levies").select("id, name, amount_per_unit").eq("status", "active").maybeSingle(),
    ]);

  const collectedThisMonth =
    (monthPayments ?? []).reduce((sum, p) => sum + Number(p.amount), 0) +
    (monthSpecial ?? []).reduce((sum, s) => sum + Number(s.amount), 0);

  const byMode = new Map<string, number>();
  for (const p of [...(monthPayments ?? []), ...(monthSpecial ?? [])]) {
    byMode.set(p.mode, (byMode.get(p.mode) ?? 0) + Number(p.amount));
  }

  const expectedByResident = Object.fromEntries((billings ?? []).map((b) => [b.resident_id, Number(b.amount)]));
  const paidByResident = new Map<string, number>();
  for (const p of periodPayments ?? []) {
    paidByResident.set(p.resident_id, (paidByResident.get(p.resident_id) ?? 0) + Number(p.amount));
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
    const { data: allSpecial } = await supabase
      .from("special_payments")
      .select("amount")
      .eq("levy_id", activeLevy.id)
      .eq("status", "active");
    const collected = (allSpecial ?? []).reduce((sum, s) => sum + Number(s.amount), 0);
    const target = Number(activeLevy.amount_per_unit) * totalActiveUnits;
    levyLine = {
      name: activeLevy.name,
      collected,
      target,
      pct: target > 0 ? Math.min(100, Math.round((collected / target) * 100)) : 0,
    };
  }

  const { data: recentPayments } = await supabase
    .from("payments")
    .select("id, resident_id, date, amount, mode, received_by, status")
    .eq("status", "active")
    .order("date", { ascending: false })
    .limit(10);
  const { data: recentSpecial } = await supabase
    .from("special_payments")
    .select("id, resident_id, date, amount, mode, received_by, status")
    .eq("status", "active")
    .order("date", { ascending: false })
    .limit(10);

  const recentEntries = [
    ...(recentPayments ?? []).map((p) => ({ ...p, type: "Monthly" as const })),
    ...(recentSpecial ?? []).map((p) => ({ ...p, type: "Levy" as const })),
  ]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 10);

  return (
    <section>
      <h2 className="text-[17px] font-semibold text-gray-900">Dashboard</h2>
      <p className="text-gray-500 text-[12.5px] mb-4">{period} · all figures in PHP</p>

      <div className="grid gap-3 sm:grid-cols-4 mb-4">
        <div className="bg-white border border-gray-200 rounded-xl p-3.5">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">Collected this month</div>
          <div className="text-[22px] font-bold mt-1">{formatPhp(collectedThisMonth)}</div>
          <div className="text-[11.5px] text-gray-500 mt-0.5">
            {paidUnitCount} of {billedUnitIds.length} units paid
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3.5">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">Outstanding ({period})</div>
          <div className="text-[22px] font-bold mt-1 text-red-700">{formatPhp(outstandingThisMonth)}</div>
          <div className="text-[11.5px] text-gray-500 mt-0.5">{unpaidUnitCount} units unpaid</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3.5">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">
            {levyLine ? `Levy: ${levyLine.name}` : "Levy"}
          </div>
          {levyLine ? (
            <>
              <div className="text-[22px] font-bold mt-1">{formatPhp(levyLine.collected)}</div>
              <div className="text-[11.5px] text-gray-500 mt-0.5">of {formatPhp(levyLine.target)} target</div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden mt-2">
                <div className="h-full bg-emerald-600" style={{ width: `${levyLine.pct}%` }} />
              </div>
            </>
          ) : (
            <div className="text-[13px] text-gray-400 mt-1">No active levy</div>
          )}
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-3.5">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">By mode ({period})</div>
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

      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
        <h3 className="text-sm font-semibold mb-3">Recent entries</h3>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-200">
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
              <tr key={e.id} className="border-b border-gray-100 last:border-0">
                <td className="px-3 py-2">{formatDate(e.date)}</td>
                <td className="px-3 py-2">{nameByResident[e.resident_id]?.unit_no ?? "—"}</td>
                <td className="px-3 py-2">{nameByResident[e.resident_id]?.name ?? "—"}</td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-block rounded-full text-[11px] px-2 py-0.5 ${
                      e.type === "Monthly" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"
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

      <Link
        href={`/dashboard/export?month=${monthStart.slice(0, 7)}`}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold inline-block"
      >
        ⬇ Export month to CSV
      </Link>
    </section>
  );
}
