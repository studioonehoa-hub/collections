"use client";

import { useState } from "react";

export function BillCard({
  billingId,
  unitNo,
  name,
  email,
  sms,
}: {
  billingId: string;
  unitNo: string;
  name: string;
  email: string;
  sms: string;
}) {
  const [copied, setCopied] = useState<"email" | "sms" | null>(null);

  async function copy(text: string, which: "email" | "sms") {
    await navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div id={billingId} className="bg-neutral-800 border border-neutral-700 p-4 scroll-mt-4">
      <h4 className="text-sm font-semibold mb-3">
        {unitNo} — {name}
      </h4>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[11px] uppercase tracking-wide text-gray-400">Email</span>
            <button
              type="button"
              onClick={() => copy(email, "email")}
              className="border border-neutral-600 px-2 py-1 text-xs"
            >
              {copied === "email" ? "Copied!" : "Copy"}
            </button>
          </div>
          <pre className="whitespace-pre-wrap text-[12px] bg-neutral-950 border border-neutral-700 p-2 leading-snug">
            {email}
          </pre>
        </div>
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[11px] uppercase tracking-wide text-gray-400">SMS ({sms.length}/320)</span>
            <button
              type="button"
              onClick={() => copy(sms, "sms")}
              className="border border-neutral-600 px-2 py-1 text-xs"
            >
              {copied === "sms" ? "Copied!" : "Copy"}
            </button>
          </div>
          <pre className="whitespace-pre-wrap text-[12px] bg-neutral-950 border border-neutral-700 p-2 leading-snug">
            {sms}
          </pre>
        </div>
      </div>
    </div>
  );
}
