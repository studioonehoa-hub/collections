"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type PaymentFormState = { error: string | null };

export async function createPayment(
  _prevState: PaymentFormState,
  formData: FormData,
): Promise<PaymentFormState> {
  await requireRole(["super_admin", "admin", "encoder"]);

  const residentId = String(formData.get("resident_id") ?? "").trim();
  const unitNo = String(formData.get("unit_no") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  const amount = String(formData.get("amount") ?? "").trim();
  const mode = String(formData.get("mode") ?? "").trim();
  const receivedBy = String(formData.get("received_by") ?? "").trim();
  const period = String(formData.get("period") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!residentId || !date || !amount || !mode || !receivedBy) {
    return { error: "Date, amount, mode, and received by are required." };
  }

  const supabase = await createClient();
  const { data: inserted, error } = await supabase
    .from("payments")
    .insert({
      resident_id: residentId,
      date,
      amount,
      mode,
      received_by: receivedBy,
      period,
      notes,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  const { error: allocError } = await supabase.rpc("allocate_payment", {
    p_payment_id: inserted.id,
  });
  if (allocError) return { error: `Payment saved but allocation failed: ${allocError.message}` };

  redirect(`/pay?unit=${encodeURIComponent(unitNo)}&saved=1`);
}
