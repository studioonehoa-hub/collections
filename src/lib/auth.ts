import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AppRole = "super_admin" | "admin" | "encoder" | "report_generator" | "resident";

export const ROLE_LABEL: Record<AppRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  encoder: "Encoder",
  report_generator: "Report Generator",
  resident: "Resident",
};

export type CurrentUser = {
  id: string;
  email: string;
  role: AppRole | null;
};

/** Reads the signed-in user + their role. Returns null if not authenticated. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Allowed by the users_select_self_or_super RLS policy (id = auth.uid()).
  const { data: row } = await supabase
    .from("users")
    .select("id, email, role")
    .eq("id", user.id)
    .single();

  if (!row) return null;

  return { id: row.id, email: row.email, role: row.role as AppRole | null };
}

/** Requires an authenticated user with a role already assigned. */
export async function requireUser(): Promise<CurrentUser & { role: AppRole }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.role) redirect("/pending");
  return user as CurrentUser & { role: AppRole };
}

/**
 * Requires an authenticated user whose role is in `allowed`. This is the
 * server-side enforcement every page/route calls directly — nav visibility
 * is a convenience, not the security boundary.
 */
export async function requireRole(allowed: AppRole[]): Promise<CurrentUser & { role: AppRole }> {
  const user = await requireUser();
  if (!allowed.includes(user.role)) redirect("/forbidden");
  return user;
}
