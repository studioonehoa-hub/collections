import { requireRole } from "@/lib/auth";
import { PlaceholderScreen } from "@/components/PlaceholderScreen";

export default async function RecordPaymentPage() {
  const user = await requireRole(["super_admin", "admin", "encoder"]);
  return (
    <PlaceholderScreen
      title="Record Payment"
      sub="Monthly dues entry — admin & encoder."
      user={user}
    />
  );
}
