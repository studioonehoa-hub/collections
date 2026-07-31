import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatPhp, parsePeriod, currentPeriod } from "@/lib/format";
import type { PaymentRow, ResidentRow, SpecialPaymentRow } from "@/lib/types";
import { voidLedgerEntry } from "./actions";

type LedgerEntry = {
  id: string;
  date: string;
  type: "Monthly" | "Levy";
  label: string;
  mode: string;
  receivedBy: string;
  amount: number;
  voided: boolean;
  voidReason: string | null;
  voidedAt: string | null;
  voidedByEmail: string | null;
};

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ unit?: string }>;
}) {
  const user = await requireRole(["super_admin", "admin", "encoder", "report_generator"]);
  const canVoid = user.role === "super_admin" || user.role === "admin";
  const { unit } = await searchParams;
  const query = unit?.trim() ?? "";
  const supabase = await createClient();

  let resident: ResidentRow | null = null;
  let entries: LedgerEntry[] = [];
  let paidYtd = 0;
  let priorUnpaid = 0;
  const priorUnpaidPeriods: string[] = [];
  let levyLabel: string | null = null;
  let levyName: string | null = null;

  if (query) {
    const { data: rows } = await supabase.rpc("resident_lookup", { p_query: query });
    resident = (rows?.[0] as ResidentRow | undefined) ?? null;
  }

  if (resident) {
    const [{ data: payments }, { data: specialPayments }, { data: billings }, { data: activeLevy }] =
      await Promise.all([
        supabase
          .from("payments")
          .select("id, date, amount, mode, received_by, period, status, void_reason, voided_at, voided_by")
          .eq("resident_id", resident.id)
          .returns<PaymentRow[]>(),
        supabase
          .from("special_payments")
          .select(
            "id, date, amount, mode, received_by, levy_id, status, void_reason, voided_at, voided_by",
          )
          .eq("resident_id", resident.id)
          .returns<SpecialPaymentRow[]>(),
        supabase.from("billings").select("period, amount").eq("resident_id", resident.id),
        supabase.from("levies").select("id, name, amount_per_unit").eq("status", "active").maybeSingle(),
      ]);

    const levyIds = [...new Set((specialPayments ?? []).map((s) => s.levy_id))];
    const { data: levies } = levyIds.length
      ? await supabase.from("levies").select("id, name").in("id", levyIds)
      : { data: [] as { id: string; name: string }[] };
    const levyNameById = Object.fromEntries((levies ?? []).map((l) => [l.id, l.name]));

    const voiderIds = [
      ...new Set(
        [...(payments ?? []), ...(specialPayments ?? [])]
          .map((r) => r.voided_by)
          .filter((v): v is string => v !== null),
      ),
    ];
    const { data: voiders } = voiderIds.length
      ? await supabase.from("staff_directory").select("id, email").in("id", voiderIds)
      : { data: [] as { id: string; email: string }[] };
    const voiderEmailById = Object.fromEntries((voiders ?? []).map((v) => [v.id, v.email]));

    entries = [
      ...(payments ?? []).map((p) => ({
        id: p.id,
        date: p.date,
        type: "Monthly" as const,
        label: p.period ?? "—",
        mode: p.mode,
        receivedBy: p.received_by,
        amount: Number(p.amount),
        voided: p.status === "voided",
        voidReason: p.void_reason,
        voidedAt: p.voided_at,
        voidedByEmail: p.voided_by ? (voiderEmailById[p.voided_by] ?? null) : null,
      })),
      ...(specialPayments ?? []).map((s) => ({
        id: s.id,
        date: s.date,
        type: "Levy" as const,
        label: levyNameById[s.levy_id] ?? "—",
        mode: s.mode,
        receivedBy: s.received_by,
        amount: Number(s.amount),
        voided: s.status === "voided",
        voidReason: s.void_reason,
        voidedAt: s.voided_at,
        voidedByEmail: s.voided_by ? (voiderEmailById[s.voided_by] ?? null) : null,
      })),
    ].sort((a, b) => (a.date < b.date ? 1 : -1));

    const currentYear = new Date().getFullYear();
    paidYtd = (payments ?? [])
      .filter((p) => p.status === "active" && new Date(`${p.date}T00:00:00`).getFullYear() === currentYear)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    // Prior unpaid balance: regular dues only, strictly periods BEFORE the
    // current one — never the current period, never levies (those are
    // tracked separately below via levyLabel).
    const paidByPeriod = new Map<string, number>();
    for (const p of payments ?? []) {
      if (p.status !== "active") continue;
      paidByPeriod.set(p.period ?? "", (paidByPeriod.get(p.period ?? "") ?? 0) + Number(p.amount));
    }
    // currentPeriod() always produces a "MMM YYYY" string parsePeriod can
    // parse; the fallback only exists to satisfy the general Date|null type.
    const thisPeriod = parsePeriod(currentPeriod()) ?? new Date();
    for (const b of billings ?? []) {
      const billPeriod = parsePeriod(b.period);
      if (!billPeriod || billPeriod >= thisPeriod) continue; // skip unparseable or current/future periods
      const paid = paidByPeriod.get(b.period) ?? 0;
      const shortfall = Number(b.amount) - paid;
      if (shortfall > 0.005) {
        priorUnpaid += shortfall;
        priorUnpaidPeriods.push(b.period);
      }
    }

    if (activeLevy) {
      levyName = activeLevy.name;
      const levyPaid = (specialPayments ?? [])
        .filter((s) => s.status === "active" && s.levy_id === activeLevy.id)
        .reduce((sum, s) => sum + Number(s.amount), 0);
      const full = Number(activeLevy.amount_per_unit);
      levyLabel = `${formatPhp(levyPaid)} of ${formatPhp(full)}`;
    }
  }

  return (
    <section>
      <h2 className="text-[17px] font-semibold text-gray-100">Unit Ledger</h2>
      <p className="text-gray-400 text-[12.5px] mb-4">
        All payments for one unit, regular and special — search by exact name or unit no.
      </p>

      <form className="flex gap-2 mb-4" action="/ledger">
        <input
          name="unit"
          defaultValue={query}
          placeholder="Type exact name or unit no…"
          className="max-w-xs w-full border border-neutral-600 bg-neutral-950 px-3 py-2 text-sm text-gray-100 outline-none focus:border-neutral-400"
        />
        <button type="submit" className="bg-neutral-100 text-neutral-900 text-sm font-semibold px-4 py-2">
          Search
        </button>
      </form>

      {query && !resident && (
        <div className="bg-neutral-800 border border-neutral-700 px-4 py-6 text-center text-gray-400 text-sm">
          No resident found for &ldquo;{query}&rdquo;.
        </div>
      )}

      {resident && (
        <>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="text-sm font-semibold">
              {resident.unit_no} — {resident.name}
            </h3>
            <Link
              href={`/ledger/export?unit=${encodeURIComponent(resident.unit_no)}`}
              className="border border-neutral-600 px-3 py-1.5 text-xs font-semibold"
            >
              ⬇ Export CSV
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 mb-4">
            <div
              className="bg-neutral-800 border border-neutral-700 p-3.5"
              title="Sum of active (non-voided) regular dues payments received this calendar year."
            >
              <div className="text-[11px] uppercase tracking-wide text-gray-400">Paid YTD</div>
              <div className="text-[22px] font-bold mt-1">{formatPhp(paidYtd)}</div>
              <div className="text-[11.5px] text-gray-400 mt-0.5">Regular dues, this calendar year</div>
            </div>
            <div
              className="bg-neutral-800 border border-neutral-700 p-3.5"
              title="Unpaid balance on regular dues bills from periods before the current one. Excludes the current period and excludes levies."
            >
              <div className="text-[11px] uppercase tracking-wide text-gray-400">Prior unpaid balance</div>
              <div className={`text-[22px] font-bold mt-1 ${priorUnpaid > 0 ? "text-red-400" : ""}`}>
                {formatPhp(priorUnpaid)}
              </div>
              {priorUnpaidPeriods.length > 0 ? (
                <div className="text-[11.5px] text-gray-400 mt-0.5">{priorUnpaidPeriods.join(", ")} unpaid</div>
              ) : (
                <div className="text-[11.5px] text-gray-400 mt-0.5">No prior periods unpaid</div>
              )}
            </div>
            <div
              className="bg-neutral-800 border border-neutral-700 p-3.5"
              title="Progress toward the active levy's per-unit amount. Separate from regular dues."
            >
              <div className="text-[11px] uppercase tracking-wide text-gray-400">
                {levyName ? `Levy: ${levyName}` : "Levy"}
              </div>
              <div className="text-[22px] font-bold mt-1">{levyLabel ?? "—"}</div>
              {!levyName && <div className="text-[11.5px] text-gray-400 mt-0.5">No active levy</div>}
            </div>
          </div>

          <div className="bg-neutral-800 border border-neutral-700 overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400 border-b border-neutral-700">
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Period / Levy</th>
                  <th className="px-3 py-2">Mode</th>
                  <th className="px-3 py-2">Received</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  {canVoid && <th className="px-3 py-2">Void</th>}
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr
                    key={e.id}
                    className={`border-b border-neutral-700 last:border-0 align-top ${e.voided ? "text-gray-400" : ""}`}
                  >
                    <td className={`px-3 py-2 ${e.voided ? "line-through" : ""}`}>{formatDate(e.date)}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block text-[11px] px-2 py-0.5 ${
                          e.type === "Monthly"
                            ? "bg-neutral-700 text-neutral-200"
                            : "bg-amber-900/40 text-amber-300"
                        }`}
                      >
                        {e.type}
                      </span>
                      {e.voided && (
                        <>
                          <span className="ml-1.5 inline-block bg-red-900/40 text-red-300 text-[11px] px-2 py-0.5">
                            Voided
                          </span>
                          <div
                            className="mt-1 text-[10.5px] text-gray-500 leading-snug max-w-[220px]"
                            title={`Voided by ${e.voidedByEmail ?? "unknown"}${e.voidedAt ? ` on ${formatDate(e.voidedAt)}` : ""}: ${e.voidReason ?? "no reason given"}`}
                          >
                            by {e.voidedByEmail ?? "—"} · {e.voidedAt ? formatDate(e.voidedAt) : "—"}
                            <br />
                            &ldquo;{e.voidReason ?? "no reason given"}&rdquo;
                          </div>
                        </>
                      )}
                    </td>
                    <td className={`px-3 py-2 ${e.voided ? "line-through" : ""}`}>{e.label}</td>
                    <td className={`px-3 py-2 ${e.voided ? "line-through" : ""}`}>{e.mode}</td>
                    <td className={`px-3 py-2 ${e.voided ? "line-through" : ""}`}>{e.receivedBy}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${e.voided ? "line-through" : ""}`}>
                      {formatPhp(e.amount)}
                    </td>
                    {canVoid && (
                      <td className="px-3 py-2">
                        {!e.voided && (
                          <form action={voidLedgerEntry} className="flex gap-1.5 items-center">
                            <input type="hidden" name="id" value={e.id} />
                            <input type="hidden" name="type" value={e.type} />
                            <input type="hidden" name="unit" value={resident?.unit_no ?? ""} />
                            <input
                              type="text"
                              name="reason"
                              required
                              placeholder="Reason (required)"
                              className="w-36 border border-neutral-600 bg-neutral-950 px-1.5 py-1 text-xs text-gray-100 outline-none focus:border-neutral-400"
                            />
                            <button type="submit" className="border border-neutral-600 px-2 py-1 text-xs shrink-0">
                              Void
                            </button>
                          </form>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={canVoid ? 7 : 6} className="px-3 py-6 text-center text-gray-400">
                      No payment history yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
