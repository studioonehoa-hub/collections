import { requireRole } from "@/lib/auth";
import { PlaceholderScreen } from "@/components/PlaceholderScreen";

export default async function DashboardPage() {
  const user = await requireRole(["super_admin", "admin", "report_generator"]);
  return (
    <PlaceholderScreen
      title="Dashboard"
      sub="Collected this month, outstanding, levy progress, recent entries."
      user={user}
    />
  );
}
