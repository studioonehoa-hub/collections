import type { AppRole } from "@/lib/auth";

export type NavItem = {
  href: string;
  label: string;
  roles: AppRole[];
};

/** Mirrors collection-system-mockup.html's nav data-roles exactly. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", roles: ["super_admin", "admin", "report_generator"] },
  { href: "/residents", label: "Residents", roles: ["super_admin"] },
  {
    href: "/lookup",
    label: "Resident Lookup",
    roles: ["super_admin", "admin", "encoder", "report_generator"],
  },
  { href: "/billing", label: "Billing", roles: ["super_admin", "admin"] },
  { href: "/pay", label: "Record Payment", roles: ["super_admin", "admin", "encoder"] },
  { href: "/levy", label: "Special Payment", roles: ["super_admin", "admin", "encoder"] },
  {
    href: "/ledger",
    label: "Unit Ledger",
    roles: ["super_admin", "admin", "encoder", "report_generator"],
  },
  { href: "/outstanding", label: "Outstanding", roles: ["super_admin", "admin", "report_generator"] },
  { href: "/aging", label: "Aging Report", roles: ["super_admin", "admin", "report_generator"] },
];
