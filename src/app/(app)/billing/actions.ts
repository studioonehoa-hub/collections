"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type DuesGroupFormState = { error: string | null };

export async function createDuesGroup(
  _prevState: DuesGroupFormState,
  formData: FormData,
): Promise<DuesGroupFormState> {
  await requireRole(["super_admin", "admin"]);
  const name = String(formData.get("name") ?? "").trim();
  const monthlyAmount = String(formData.get("monthly_amount") ?? "").trim();

  if (!name || !monthlyAmount) {
    return { error: "Name and monthly amount are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("dues_groups").insert({ name, monthly_amount: monthlyAmount });
  if (error) return { error: error.message };

  redirect("/billing");
}

export async function updateDuesGroup(
  _prevState: DuesGroupFormState,
  formData: FormData,
): Promise<DuesGroupFormState> {
  await requireRole(["super_admin", "admin"]);
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const monthlyAmount = String(formData.get("monthly_amount") ?? "").trim();

  if (!id || !name || !monthlyAmount) {
    return { error: "Name and monthly amount are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("dues_groups")
    .update({ name, monthly_amount: monthlyAmount })
    .eq("id", id);
  if (error) return { error: error.message };

  redirect("/billing");
}

// Plain (non-useActionState) actions below: these re-render the same page in
// place via revalidatePath rather than navigating, so they don't need
// client-side pending/error state.

export async function generateBillingRun(formData: FormData) {
  await requireRole(["super_admin", "admin"]);
  const period = String(formData.get("period") ?? "").trim();
  if (!period) return;

  const supabase = await createClient();
  await supabase.rpc("generate_billing_run", { p_period: period });
  revalidatePath("/billing");
}

export async function markBillingSent(formData: FormData) {
  await requireRole(["super_admin", "admin"]);
  const billingId = String(formData.get("billing_id") ?? "");
  const sentVia = String(formData.get("sent_via") ?? "");
  if (!billingId || !sentVia) return;

  const supabase = await createClient();
  await supabase
    .from("billings")
    .update({ sent_via: sentVia, sent_at: new Date().toISOString().slice(0, 10) })
    .eq("id", billingId);
  revalidatePath("/billing");
}

export async function markBillingReceived(formData: FormData) {
  await requireRole(["super_admin", "admin"]);
  const billingId = String(formData.get("billing_id") ?? "");
  const receivedStatus = String(formData.get("received_status") ?? "");
  if (!billingId || !receivedStatus) return;

  const supabase = await createClient();
  await supabase
    .from("billings")
    .update({ received_status: receivedStatus, received_at: new Date().toISOString().slice(0, 10) })
    .eq("id", billingId);
  revalidatePath("/billing");
}
