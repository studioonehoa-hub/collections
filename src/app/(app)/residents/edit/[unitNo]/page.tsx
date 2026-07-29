import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ResidentForm } from "@/components/ResidentForm";
import { updateResident } from "../../actions";
import type { ResidentRow } from "@/lib/types";

export default async function EditResidentPage({
  params,
}: {
  params: Promise<{ unitNo: string }>;
}) {
  await requireRole(["super_admin", "admin"]);
  const { unitNo } = await params;
  const supabase = await createClient();

  const { data: duesGroups } = await supabase
    .from("dues_groups")
    .select("id, name, monthly_amount")
    .order("name");

  // Uses resident_lookup() (SECURITY DEFINER, exact match) rather than a direct
  // table SELECT — this page is reachable by admin, who has no blanket SELECT
  // policy on residents, so the RPC is the only way it can read the row.
  const { data: rows } = await supabase.rpc("resident_lookup", {
    p_query: decodeURIComponent(unitNo),
  });
  const resident = (rows?.[0] as ResidentRow | undefined) ?? null;

  if (!resident) notFound();

  return (
    <section>
      <h2 className="text-[17px] font-semibold text-gray-900">
        Edit {resident.unit_no} — {resident.name}
      </h2>
      <p className="text-gray-500 text-[12.5px] mb-4">
        Update dues assignment, contacts, or status.
      </p>
      <ResidentForm
        action={updateResident}
        duesGroups={duesGroups ?? []}
        submitLabel="Save changes"
        showStatus
        defaults={resident}
      />
    </section>
  );
}
