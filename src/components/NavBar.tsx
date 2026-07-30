"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/nav";

export function NavBar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-5 py-2 flex gap-1.5 overflow-x-auto">
      {items.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-3.5 py-1.5 rounded-lg text-[13px] font-bold whitespace-nowrap transition-colors ${
              active
                ? "bg-blue-600 text-white"
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
