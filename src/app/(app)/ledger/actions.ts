"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Payments are immutable by design (see src/db/schema.ts) — this is the only
// way an entry's status can change. void_payment/void_special_payment are
// SECURITY DEFINER functions that independently re-check admin+ on the DB
// side, so this requireRole() is belt-and-suspenders, not the only gate.
export async function voidLedgerEntry(formData: FormData) {
  await requireRole(["super_admin", "admin"]);

  const id = String(formData.get("id") ?? "");
  const type = String(formData.get("type") ?? "");
  const unit = String(formData.get("unit") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  // Reason is required for the audit trail — who and when are already
  // captured automatically (voided_by/voided_at, set server-side from the
  // caller's own session), but why is only ever known if someone writes it
  // down. The HTML input enforces this too; this is the real gate.
  if (!id || !reason || (type !== "Monthly" && type !== "Levy")) return;

  const supabase = await createClient();

  if (type === "Monthly") {
    await supabase.rpc("void_payment", { p_payment_id: id, p_reason: reason });
  } else {
    await supabase.rpc("void_special_payment", { p_special_payment_id: id, p_reason: reason });
  }

  revalidatePath(`/ledger`);
  if (unit) revalidatePath(`/ledger?unit=${encodeURIComponent(unit)}`);
}
