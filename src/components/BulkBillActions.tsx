"use client";

import { useState } from "react";

type BulkBill = { unitNo: string; name: string; email: string; sms: string };

const SEPARATOR = "\n\n----------------------------------------\n\n";

export function BulkBillActions({ bills, period }: { bills: BulkBill[]; period: string }) {
  const [copied, setCopied] = useState<"email" | "sms" | null>(null);

  async function copyAll(which: "email" | "sms") {
    const text = bills
      .map((b) => `${b.unitNo} — ${b.name}\n\n${which === "email" ? b.email : b.sms}`)
      .join(SEPARATOR);
    await navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="flex gap-2 flex-wrap items-center">
      <button
        type="button"
        onClick={() => copyAll("email")}
        disabled={bills.length === 0}
        className="border border-neutral-600 px-3 py-2 text-sm font-semibold disabled:opacity-50"
      >
        {copied === "email" ? "Copied all emails!" : "Copy all (Email)"}
      </button>
      <button
        type="button"
        onClick={() => copyAll("sms")}
        disabled={bills.length === 0}
        className="border border-neutral-600 px-3 py-2 text-sm font-semibold disabled:opacity-50"
      >
        {copied === "sms" ? "Copied all SMS!" : "Copy all (SMS)"}
      </button>
      <a
        href={`/billing/bills/export?period=${encodeURIComponent(period)}&format=email`}
        className="border border-neutral-600 px-3 py-2 text-sm font-semibold"
      >
        ⬇ Download all (Email)
      </a>
      <a
        href={`/billing/bills/export?period=${encodeURIComponent(period)}&format=sms`}
        className="border border-neutral-600 px-3 py-2 text-sm font-semibold"
      >
        ⬇ Download all (SMS)
      </a>
    </div>
  );
}
