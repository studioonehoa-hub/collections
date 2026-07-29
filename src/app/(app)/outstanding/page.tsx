import { requireRole } from "@/lib/auth";
import { PlaceholderScreen } from "@/components/PlaceholderScreen";

export default async function OutstandingPage() {
  const user = await requireRole(["super_admin", "admin", "report_generator"]);
  return (
    <PlaceholderScreen
      title="Outstanding Report"
      sub="Billed vs paid per unit, per month."
      user={user}
    />
  );
}
