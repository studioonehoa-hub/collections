import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { NAV_ITEMS } from "@/lib/nav";

export default async function RootPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.role) redirect("/pending");

  const homeHref = NAV_ITEMS.find((item) => item.roles.includes(user.role!))?.href ?? "/pending";
  redirect(homeHref);
}
