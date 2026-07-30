import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ResidentsTable } from "@/components/ResidentsTable";

export default async function ResidentsPage() {
  await requireRole(["super_admin"]);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("residents")
    .select(
      "id, name, unit_no, status, dues_group_id, dues_override, billing_contact_1, billing_contact_2, dues_groups(id, name, monthly_amount)",
    )
    .order("unit_no");

  // The untyped Supabase client can't infer that dues_group_id → dues_groups.id
  // is a to-one relationship, so it types (and Postgrest sometimes shapes) the
  // embed as an array; normalize to a single object either way.
  const residents = (data ?? []).map((r) => ({
    ...r,
    dues_groups: Array.isArray(r.dues_groups) ? (r.dues_groups[0] ?? null) : r.dues_groups,
  }));

  return (
    <section>
      <h2 className="text-[17px] font-semibold text-gray-100">Residents — Full Database 🔒</h2>
      <p className="text-gray-400 text-[12.5px] mb-4">
        Super Admin only — the only screen where the resident list can be viewed in aggregate.
        Every other role reaches residents one at a time via Resident Lookup.
      </p>

      <div className="flex justify-end mb-3">
        <Link
          href="/residents/new"
          className="rounded-lg bg-blue-600 text-white text-sm font-semibold px-4 py-2"
        >
          + Add resident
        </Link>
      </div>

      {error ? (
        <div className="rounded-lg bg-red-900/30 border border-red-800 text-red-300 text-sm px-3 py-2">
          {error.message}
        </div>
      ) : (
        <ResidentsTable residents={residents} />
      )}
    </section>
  );
}
