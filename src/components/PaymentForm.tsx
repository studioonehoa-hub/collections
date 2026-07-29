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
  submitLabel,
}: {
  action: (state: PaymentFormState, formData: FormData) => Promise<PaymentFormState>;
  residentId: string;
  unitNo: string;
  defaultAmount: string;
  defaultPeriod: string;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="bg-white border border-gray-200 rounded-xl p-4">
      <input type="hidden" name="resident_id" value={residentId} />
      <input type="hidden" name="unit_no" value={unitNo} />

      {state.error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
          {state.error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 mb-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Date received</label>
          <input
            name="date"
            type="date"
            required
            defaultValue={today}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-700"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Amount (₱)</label>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={defaultAmount}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-700"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Mode</label>
          <select
            name="mode"
            required
            defaultValue="bank_transfer"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white"
          >
            {MODES.map((m) => (
              <option key={m} value={m}>
                {MODE_LABEL[m]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Received by</label>
          <select
            name="received_by"
            required
            defaultValue="bank"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white"
          >
            <option value="bank">Bank</option>
            <option value="admin_office">Admin office</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">For period (optional)</label>
          <input
            name="period"
            defaultValue={defaultPeriod}
            placeholder="e.g. Jul 2026"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-700"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Notes (optional)</label>
          <input
            name="notes"
            placeholder="OR #, remarks…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-700"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-blue-700 text-white text-sm font-semibold px-4 py-2 disabled:opacity-50"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
