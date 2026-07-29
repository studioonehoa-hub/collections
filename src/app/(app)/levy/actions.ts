"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type SpecialPaymentFormState = { error: string | null };

export async function createSpecialPayment(
  _prevState: SpecialPaymentFormState,
  formData: FormData,
): Promise<SpecialPaymentFormState> {
  await requireRole(["super_admin", "admin", "encoder"]);

  const residentId = String(formData.get("resident_id") ?? "").trim();
  const unitNo = String(formData.get("unit_no") ?? "").trim();
  const levyId = String(formData.get("levy_id") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const amount = String(formData.get("amount") ?? "").trim();
  const mode = String(formData.get("mode") ?? "").trim();
  const receivedBy = String(formData.get("received_by") ?? "").trim();

  if (!residentId || !levyId || !date || !amount || !mode || !receivedBy) {
    return { error: "Amount, mode, and received by are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("special_payments").insert({
    resident_id: residentId,
    levy_id: levyId,
    date,
    amount,
    mode,
    received_by: receivedBy,
  });

  if (error) return { error: error.message };

  redirect(`/levy?unit=${encodeURIComponent(unitNo)}&saved=1`);
}
