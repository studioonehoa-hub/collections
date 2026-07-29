import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DuesGroupForm } from "@/components/DuesGroupForm";
import { updateDuesGroup } from "../../../actions";

export default async function EditDuesGroupPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["super_admin", "admin"]);
  const { id } = await params;
  const supabase = await createClient();

  const { data: group } = await supabase
    .from("dues_groups")
    .select("id, name, monthly_amount")
    .eq("id", id)
    .maybeSingle();

  if (!group) notFound();

  return (
    <section>
      <h2 className="text-[17px] font-semibold text-gray-900">Edit {group.name}</h2>
      <p className="text-gray-500 text-[12.5px] mb-4">Recurring monthly amount for members of this group.</p>
      <DuesGroupForm action={updateDuesGroup} defaults={group} submitLabel="Save changes" />
    </section>
  );
}
