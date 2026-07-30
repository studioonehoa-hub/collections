import { requireRole } from "@/lib/auth";
import { DuesGroupForm } from "@/components/DuesGroupForm";
import { createDuesGroup } from "../../actions";

export default async function NewDuesGroupPage() {
  await requireRole(["super_admin", "admin"]);

  return (
    <section>
      <h2 className="text-[17px] font-semibold text-gray-100">Add dues group</h2>
      <p className="text-gray-400 text-[12.5px] mb-4">Recurring monthly amount for members of this group.</p>
      <DuesGroupForm action={createDuesGroup} submitLabel="Add group" />
    </section>
  );
}
