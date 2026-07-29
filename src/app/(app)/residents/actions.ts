"use server";

import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type ResidentFormState = { error: string | null };

function readResidentFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const unitNo = String(formData.get("unit_no") ?? "").trim();
  const duesGroupId = String(formData.get("dues_group_id") ?? "").trim();
  const duesOverrideRaw = String(formData.get("dues_override") ?? "").trim();
  const billingContact1 = String(formData.get("billing_contact_1") ?? "").trim() || null;
  const billingContact2 = String(formData.get("billing_contact_2") ?? "").trim() || null;

  return {
    name,
    unitNo,
    duesGroupId,
    duesOverride: duesOverrideRaw === "" ? null : duesOverrideRaw,
    billingContact1,
    billingContact2,
  };
}

// requireRole runs inside the action itself — this is the real enforcement.
// A page hiding the form for the wrong role is a convenience, not the gate.

export async function createResident(
  _prevState: ResidentFormState,
  formData: FormData,
): Promise<ResidentFormState> {
  const user = await requireRole(["super_admin", "admin"]);
  const { name, unitNo, duesGroupId, duesOverride, billingContact1, billingContact2 } =
    readResidentFields(formData);

  if (!name || !unitNo || !duesGroupId) {
    return { error: "Name, unit number, and dues group are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("residents").insert({
    name,
    unit_no: unitNo,
    dues_group_id: duesGroupId,
    dues_override: duesOverride,
    billing_contact_1: billingContact1,
    billing_contact_2: billingContact2,
  });

  if (error) {
    return { error: error.code === "23505" ? `Unit ${unitNo} already exists.` : error.message };
  }

  redirect(user.role === "super_admin" ? "/residents" : `/lookup?q=${encodeURIComponent(unitNo)}`);
}

export async function updateResident(
  _prevState: ResidentFormState,
  formData: FormData,
): Promise<ResidentFormState> {
  const user = await requireRole(["super_admin", "admin"]);
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "active");
  const { name, unitNo, duesGroupId, duesOverride, billingContact1, billingContact2 } =
    readResidentFields(formData);

  if (!id || !name || !unitNo || !duesGroupId) {
    return { error: "Name, unit number, and dues group are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("residents")
    .update({
      name,
      unit_no: unitNo,
      dues_group_id: duesGroupId,
      dues_override: duesOverride,
      billing_contact_1: billingContact1,
      billing_contact_2: billingContact2,
      status,
    })
    .eq("id", id);

  if (error) {
    return { error: error.code === "23505" ? `Unit ${unitNo} already exists.` : error.message };
  }

  redirect(user.role === "super_admin" ? "/residents" : `/lookup?q=${encodeURIComponent(unitNo)}`);
}
