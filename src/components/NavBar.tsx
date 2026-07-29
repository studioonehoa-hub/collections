"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/nav";

export function NavBar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-gray-200 px-5 flex gap-0.5 overflow-x-auto">
      {items.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-3.5 py-3 text-[13px] whitespace-nowrap border-b-2 ${
              active
                ? "text-blue-700 border-blue-700 font-semibold"
                : "text-gray-500 border-transparent hover:text-gray-800"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
