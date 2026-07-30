import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatPhp } from "@/lib/format";
import type { LevyRow, ResidentRow } from "@/lib/types";
import { createSpecialPayment } from "./actions";
import { SpecialPaymentForm } from "@/components/SpecialPaymentForm";

type ProgressRow = { unit_no: string; name: string | null; paid: number; lastDate: string | null };

export default async function SpecialPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ unit?: string; saved?: string }>;
}) {
  const user = await requireRole(["super_admin", "admin", "encoder"]);
  const { unit, saved } = await searchParams;
  const query = unit?.trim() ?? "";
  const supabase = await createClient();

  const { data: levy } = await supabase
    .from("levies")
    .select("id, name, amount_per_unit, status")
    .eq("status", "active")
    .maybeSingle<LevyRow>();

  let resident: ResidentRow | null = null;

  if (levy && query) {
    const { data: rows } = await supabase.rpc("resident_lookup", { p_query: query });
    resident = (rows?.[0] as ResidentRow | undefined) ?? null;
  }

  // Levy progress: encoder never sees name+unit in aggregate (unit-only
  // resident_directory), matching the same rule Billing/Outstanding/Dashboard
  // follow — only super_admin/admin get resident_report_directory's name.
  let progress: ProgressRow[] = [];
  let paidCount = 0;

  if (levy) {
    const directoryTable = user.role === "encoder" ? "resident_directory" : "resident_report_directory";
    const { data: directory } = await supabase
      .from(directoryTable)
      .select(user.role === "encoder" ? "id, unit_no, status" : "id, unit_no, name, status")
      .eq("status", "active")
      .order("unit_no")
      .returns<{ id: string; unit_no: string; name?: string; status: string }[]>();

    const { data: payments } = await supabase
      .from("special_payments")
      .select("resident_id, amount, date, status")
      .eq("levy_id", levy.id)
      .eq("status", "active");

    const paidByResident = new Map<string, { total: number; lastDate: string }>();
    for (const p of payments ?? []) {
      const existing = paidByResident.get(p.resident_id);
      const total = (existing?.total ?? 0) + Number(p.amount);
      const lastDate = !existing || p.date > existing.lastDate ? p.date : existing.lastDate;
      paidByResident.set(p.resident_id, { total, lastDate });
    }

    progress = (directory ?? []).map((d) => ({
      unit_no: d.unit_no,
      name: d.name ?? null,
      paid: paidByResident.get(d.id)?.total ?? 0,
      lastDate: paidByResident.get(d.id)?.lastDate ?? null,
    }));

    paidCount = progress.filter((p) => p.paid >= Number(levy.amount_per_unit)).length;
  }

  return (
    <section>
      <h2 className="text-[17px] font-semibold text-gray-100">Special Payment</h2>
      {levy ? (
        <p className="text-gray-400 text-[12.5px] mb-4">
          Active levy: <b>{levy.name}</b> — {formatPhp(Number(levy.amount_per_unit))}/unit
        </p>
      ) : (
        <p className="text-gray-400 text-[12.5px] mb-4">No active levy right now.</p>
      )}

      {levy && (
        <>
          <form className="flex gap-2 mb-4" action="/levy">
            <input
              name="unit"
              defaultValue={query}
              placeholder="Type exact name or unit no…"
              className="max-w-xs w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 outline-none focus:border-blue-500"
            />
            <button type="submit" className="rounded-lg bg-blue-600 text-white text-sm font-semibold px-4 py-2">
              Search
            </button>
          </form>

          {saved === "1" && (
            <div className="mb-4 rounded-lg bg-emerald-900/30 border border-emerald-800 text-emerald-300 text-sm px-3 py-2">
              Special payment saved.
            </div>
          )}

          {query && !resident && (
            <div className="mb-4 rounded-lg bg-gray-900 border border-gray-800 px-4 py-6 text-center text-gray-400 text-sm">
              No resident found for &ldquo;{query}&rdquo;.
            </div>
          )}

          {resident && (
            <div className="mb-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4">
                <h3 className="text-sm font-semibold">
                  {resident.unit_no} — {resident.name}
                </h3>
              </div>
              <SpecialPaymentForm
                action={createSpecialPayment}
                residentId={resident.id}
                unitNo={resident.unit_no}
                levyId={levy.id}
                defaultAmount={Number(levy.amount_per_unit).toFixed(2)}
                submitLabel="Save special payment"
              />
            </div>
          )}

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3">
              Levy progress — {paidCount} of {progress.length} units paid
            </h3>
            <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400 border-b border-gray-800">
                  <th className="px-3 py-2">Unit</th>
                  {user.role !== "encoder" && <th className="px-3 py-2">Name</th>}
                  <th className="px-3 py-2 text-right">Paid</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {progress.map((p) => {
                  const full = Number(levy.amount_per_unit);
                  const status = p.paid >= full ? "Paid" : p.paid > 0 ? "Partial" : "Unpaid";
                  const badge =
                    status === "Paid"
                      ? "bg-emerald-900/40 text-emerald-300"
                      : status === "Partial"
                        ? "bg-amber-900/40 text-amber-300"
                        : "bg-red-900/40 text-red-300";
                  return (
                    <tr key={p.unit_no} className="border-b border-gray-800 last:border-0">
                      <td className="px-3 py-2">{p.unit_no}</td>
                      {user.role !== "encoder" && <td className="px-3 py-2">{p.name}</td>}
                      <td className="px-3 py-2 text-right tabular-nums">
                        {p.paid > 0 ? formatPhp(p.paid) : "—"}
                      </td>
                      <td className="px-3 py-2">{p.lastDate ? formatDate(p.lastDate) : "—"}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-block rounded-full text-[11px] px-2 py-0.5 ${badge}`}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {progress.length === 0 && (
                  <tr>
                    <td colSpan={user.role !== "encoder" ? 5 : 4} className="px-3 py-6 text-center text-gray-400">
                      No active residents yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
