import { requireRole } from "@/lib/auth";
import { PlaceholderScreen } from "@/components/PlaceholderScreen";

export default async function LedgerPage() {
  const user = await requireRole(["super_admin", "admin", "encoder", "report_generator"]);
  return (
    <PlaceholderScreen
      title="Unit Ledger"
      sub="All payments for one unit, regular and special — including voided entries, marked as such."
      user={user}
    />
  );
}
