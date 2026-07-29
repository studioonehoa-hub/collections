import { requireRole } from "@/lib/auth";
import { PlaceholderScreen } from "@/components/PlaceholderScreen";

export default async function SpecialPaymentPage() {
  const user = await requireRole(["super_admin", "admin", "encoder"]);
  return (
    <PlaceholderScreen
      title="Special Payment"
      sub="Payments against the active levy, and levy progress by unit."
      user={user}
    />
  );
}
