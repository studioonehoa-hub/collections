import { requireRole } from "@/lib/auth";
import { PlaceholderScreen } from "@/components/PlaceholderScreen";

export default async function LookupPage() {
  const user = await requireRole(["super_admin", "admin", "encoder", "report_generator"]);
  return (
    <PlaceholderScreen
      title="Resident Lookup"
      sub="Search one resident at a time — no list browsing, no export."
      user={user}
    />
  );
}
