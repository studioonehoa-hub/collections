import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { currentPeriod, formatPhp } from "@/lib/format";
import type { ResidentRow } from "@/lib/types";
import { createPayment } from "./actions";
import { PaymentForm } from "@/components/PaymentForm";

export default async function RecordPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ unit?: string; saved?: string }>;
}) {
  await requireRole(["super_admin", "admin", "encoder"]);
  const { unit, saved } = await searchParams;
  const query = unit?.trim() ?? "";
  const supabase = await createClient();

  let resident: ResidentRow | null = null;
  let groupLabel = "";
  let defaultAmount = "";

  if (query) {
    const { data: rows } = await supabase.rpc("resident_lookup", { p_query: query });
    resident = (rows?.[0] as ResidentRow | undefined) ?? null;

    if (resident) {
      const { data: group } = await supabase
        .from("dues_groups")
        .select("name, monthly_amount")
        .eq("id", resident.dues_group_id)
        .maybeSingle();

      const override = resident.dues_override !== null ? Number(resident.dues_override) : null;
      const amount = override ?? Number(group?.monthly_amount ?? 0);
      groupLabel = `${group?.name ?? "—"}${override !== null ? " (override)" : ""} — ${formatPhp(amount)}/mo`;
      defaultAmount = amount.toFixed(2);
    }
  }

  return (
    <section>
      <h2 className="text-[17px] font-semibold text-gray-100">Record Payment</h2>
      <p className="text-gray-400 text-[12.5px] mb-4">
        Monthly dues entry · admin &amp; encoder — search for the exact unit or name first.
      </p>

      <form className="flex gap-2 mb-4" action="/pay">
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
          Payment saved.
        </div>
      )}

      {query && !resident && (
        <div className="rounded-lg bg-gray-900 border border-gray-800 px-4 py-6 text-center text-gray-400 text-sm">
          No resident found for &ldquo;{query}&rdquo;.
        </div>
      )}

      {resident && (
        <>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4">
            <h3 className="text-sm font-semibold">
              {resident.unit_no} — {resident.name}
            </h3>
            <p className="text-gray-400 text-[12.5px] mt-1">{groupLabel}</p>
          </div>

          <PaymentForm
            action={createPayment}
            residentId={resident.id}
            unitNo={resident.unit_no}
            defaultAmount={defaultAmount}
            defaultPeriod={currentPeriod()}
            submitLabel="Save payment"
          />
          <p className="text-gray-400 text-[12px] mt-2">
            After saving, this entry appears on the unit&apos;s ledger and factors into the outstanding report
            automatically.
          </p>
        </>
      )}
    </section>
  );
}
