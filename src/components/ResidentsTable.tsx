"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPhp } from "@/lib/format";
import type { DuesGroupRow, ResidentRow } from "@/lib/types";

type Row = ResidentRow & { dues_groups: Pick<DuesGroupRow, "id" | "name" | "monthly_amount"> | null };

export function ResidentsTable({ residents }: { residents: Row[] }) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const filtered = needle
    ? residents.filter(
        (r) => r.name.toLowerCase().includes(needle) || r.unit_no.toLowerCase().includes(needle),
      )
    : residents;

  return (
    <div>
      <input
        placeholder="Search name or unit…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="mb-3 w-full max-w-xs border border-neutral-600 bg-neutral-950 px-3 py-2 text-sm text-gray-100 outline-none focus:border-neutral-400"
      />

      <div className="bg-neutral-800 border border-neutral-700 overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 border-b border-neutral-700">
              <th className="px-3 py-2">Unit</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Billing contact 1</th>
              <th className="px-3 py-2">Billing contact 2</th>
              <th className="px-3 py-2">Group</th>
              <th className="px-3 py-2 text-right">Monthly dues</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const override = r.dues_override !== null ? parseFloat(r.dues_override) : null;
              const groupAmount = r.dues_groups ? parseFloat(r.dues_groups.monthly_amount) : 0;
              const effective = override ?? groupAmount;

              return (
                <tr key={r.id} className="border-b border-neutral-700 last:border-0">
                  <td className="px-3 py-2">{r.unit_no}</td>
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2">{r.billing_contact_1 || "—"}</td>
                  <td className="px-3 py-2">{r.billing_contact_2 || "—"}</td>
                  <td className="px-3 py-2">
                    {r.dues_groups?.name ?? "—"}
                    {override !== null && (
                      <span className="ml-1.5 inline-block bg-amber-900/40 text-amber-300 text-[11px] px-2 py-0.5">
                        override {formatPhp(override)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatPhp(effective)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block text-[11px] px-2 py-0.5 ${
                        r.status === "active"
                          ? "bg-emerald-900/40 text-emerald-300"
                          : "bg-red-900/40 text-red-300"
                      }`}
                    >
                      {r.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/residents/edit/${encodeURIComponent(r.unit_no)}`}
                      className="border border-neutral-600 px-2.5 py-1 text-xs"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-gray-400">
                  No residents match &ldquo;{q}&rdquo;.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
