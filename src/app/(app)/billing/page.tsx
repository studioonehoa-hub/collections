import { requireRole } from "@/lib/auth";
import { PlaceholderScreen } from "@/components/PlaceholderScreen";

export default async function BillingPage() {
  const user = await requireRole(["super_admin", "admin"]);
  return (
    <PlaceholderScreen
      title="Billing"
      sub="Dues groups and the monthly billing run — generate, dispatch, track receipt."
      user={user}
    />
  );
}
