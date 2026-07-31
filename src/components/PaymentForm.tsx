"use client";

import { useActionState } from "react";

export type PaymentFormState = { error: string | null };

const MODES = ["cash", "cheque", "bank_transfer", "online"] as const;
const MODE_LABEL: Record<string, string> = {
  cash: "Cash",
  cheque: "Cheque",
  bank_transfer: "Bank transfer",
  online: "GCash / online",
};

export function PaymentForm({
  action,
  residentId,
  unitNo,
  defaultAmount,
  defaultPeriod,
  periods,
  submitLabel,
}: {
  action: (state: PaymentFormState, formData: FormData) => Promise<PaymentFormState>;
  residentId: string;
  unitNo: string;
  defaultAmount: string;
  defaultPeriod: string;
  periods: string[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="bg-neutral-800 border border-neutral-700 p-4">
      <input type="hidden" name="resident_id" value={residentId} />
      <input type="hidden" name="unit_no" value={unitNo} />

      {state.error && (
        <div className="mb-4 bg-red-900/30 border border-red-800 text-red-300 text-sm px-3 py-2">
          {state.error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 mb-4">
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1">Date received</label>
          <input
            name="date"
            type="date"
            required
            defaultValue={today}
            className="w-full border border-neutral-600 bg-neutral-950 px-3 py-2 text-sm text-gray-100 outline-none focus:border-neutral-400"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1">Amount (₱)</label>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={defaultAmount}
            className="w-full border border-neutral-600 bg-neutral-950 px-3 py-2 text-sm text-gray-100 outline-none focus:border-neutral-400"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1">Mode</label>
          <select
            name="mode"
            required
            defaultValue="bank_transfer"
            className="w-full border border-neutral-600 px-3 py-2 text-sm text-gray-100 bg-neutral-950"
          >
            {MODES.map((m) => (
              <option key={m} value={m}>
                {MODE_LABEL[m]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1">Received by</label>
          <select
            name="received_by"
            required
            defaultValue="bank"
            className="w-full border border-neutral-600 px-3 py-2 text-sm text-gray-100 bg-neutral-950"
          >
            <option value="bank">Bank</option>
            <option value="admin_office">Admin office</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1">For period (optional)</label>
          <select
            name="period"
            defaultValue={periods.includes(defaultPeriod) ? defaultPeriod : ""}
            className="w-full border border-neutral-600 px-3 py-2 text-sm text-gray-100 bg-neutral-950"
          >
            <option value="">No period (arrears / general)</option>
            {periods.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1">Notes (optional)</label>
          <input
            name="notes"
            placeholder="OR #, remarks…"
            className="w-full border border-neutral-600 bg-neutral-950 px-3 py-2 text-sm text-gray-100 outline-none focus:border-neutral-400"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="bg-neutral-100 text-neutral-900 text-sm font-semibold px-4 py-2 disabled:opacity-50"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
