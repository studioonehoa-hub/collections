import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatPhp } from "@/lib/format";
import type { ResidentRow } from "@/lib/types";

export default async function LookupPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireRole(["super_admin", "admin", "encoder", "report_generator"]);
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const canEdit = user.role === "super_admin" || user.role === "admin";

  const supabase = await createClient();

  let resident: ResidentRow | null = null;
  let groupLabel: string | null = null;

  if (query) {
    // resident_lookup() is a SECURITY DEFINER function: exact match only, at
    // most one row, structurally incapable of returning a list — this is what
    // "single lookup, not aggregate list" actually rests on for every role
    // that isn't super_admin (see supabase/sql/rls_policies.sql).
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
    }
  }

  return (
    <section>
      <h2 className="text-[17px] font-semibold text-gray-100">Resident Lookup</h2>
      <p className="text-gray-400 text-[12.5px] mb-4">
        Search one resident at a time — exact name or unit no. No list browsing, no export.
      </p>

      <form className="flex gap-2 mb-4 flex-wrap" action="/lookup">
        <input
          name="q"
          defaultValue={query}
          placeholder="Type exact name or unit no…"
          className="max-w-xs w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          className="rounded-lg bg-blue-600 text-white text-sm font-semibold px-4 py-2"
        >
          Search
        </button>
        {canEdit && (
          <Link
            href="/residents/new"
            className="rounded-lg border border-gray-700 text-gray-100 text-sm font-semibold px-4 py-2 ml-auto"
          >
            + Add resident
          </Link>
        )}
      </form>

      {query && !resident && (
        <div className="rounded-lg bg-gray-900 border border-gray-800 px-4 py-6 text-center text-gray-400 text-sm">
          No resident found for &ldquo;{query}&rdquo;.
        </div>
      )}

      {resident && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3">
            {resident.unit_no} — {resident.name}
          </h3>
          <table className="w-full text-[13px]">
            <tbody>
              <tr>
                <td className="text-gray-400 py-1 pr-4 w-48 align-top">Group / dues</td>
                <td className="py-1">{groupLabel}</td>
              </tr>
              <tr>
                <td className="text-gray-400 py-1 pr-4 align-top">Billing contact 1</td>
                <td className="py-1">{resident.billing_contact_1 || "—"}</td>
              </tr>
              <tr>
                <td className="text-gray-400 py-1 pr-4 align-top">Billing contact 2</td>
                <td className="py-1">{resident.billing_contact_2 || "—"}</td>
              </tr>
              <tr>
                <td className="text-gray-400 py-1 pr-4 align-top">Status</td>
                <td className="py-1">
                  <span
                    className={`inline-block rounded-full text-[11px] px-2 py-0.5 ${
                      resident.status === "active"
                        ? "bg-emerald-900/40 text-emerald-300"
                        : "bg-red-900/40 text-red-300"
                    }`}
                  >
                    {resident.status === "active" ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>

          <div className="mt-3 flex gap-2 flex-wrap">
            <Link
              href={`/ledger?unit=${encodeURIComponent(resident.unit_no)}`}
              className="rounded-lg border border-gray-700 text-xs font-semibold px-3 py-1.5"
            >
              View ledger
            </Link>
            <Link
              href={`/pay?unit=${encodeURIComponent(resident.unit_no)}`}
              className="rounded-lg border border-gray-700 text-xs font-semibold px-3 py-1.5"
            >
              Record payment
            </Link>
            {canEdit && (
              <Link
                href={`/residents/edit/${encodeURIComponent(resident.unit_no)}`}
                className="rounded-lg border border-gray-700 text-xs font-semibold px-3 py-1.5"
              >
                Edit
              </Link>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
