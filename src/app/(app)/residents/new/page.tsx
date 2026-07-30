import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ResidentForm } from "@/components/ResidentForm";
import { createResident } from "../actions";

export default async function NewResidentPage() {
  await requireRole(["super_admin", "admin"]);
  const supabase = await createClient();

  const { data: duesGroups } = await supabase
    .from("dues_groups")
    .select("id, name, monthly_amount")
    .order("name");

  return (
    <section>
      <h2 className="text-[17px] font-semibold text-gray-100">Add resident</h2>
      <p className="text-gray-400 text-[12.5px] mb-4">
        New unit, dues assignment, and billing contacts.
      </p>
      <ResidentForm action={createResident} duesGroups={duesGroups ?? []} submitLabel="Add resident" />
    </section>
  );
}
