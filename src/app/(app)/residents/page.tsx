import { requireRole } from "@/lib/auth";
import { PlaceholderScreen } from "@/components/PlaceholderScreen";

export default async function ResidentsPage() {
  const user = await requireRole(["super_admin"]);
  return (
    <PlaceholderScreen
      title="Residents — Full Database 🔒"
      sub="Super Admin only — the only screen where the resident list can be viewed, exported, or printed in aggregate."
      user={user}
    />
  );
}
