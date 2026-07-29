"use client";

import { useActionState } from "react";

export type SpecialPaymentFormState = { error: string | null };

const MODES = ["cash", "cheque", "bank_transfer", "online"] as const;
const MODE_LABEL: Record<string, string> = {
  cash: "Cash",
  cheque: "Cheque",
  bank_transfer: "Bank transfer",
  online: "GCash / online",
};

export function SpecialPaymentForm({
  action,
  residentId,
  unitNo,
  levyId,
  defaultAmount,
  submitLabel,
}: {
  action: (state: SpecialPaymentFormState, formData: FormData) => Promise<SpecialPaymentFormState>;
  residentId: string;
  unitNo: string;
  levyId: string;
  defaultAmount: string;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="bg-white border border-gray-200 rounded-xl p-4">
      <input type="hidden" name="resident_id" value={residentId} />
      <input type="hidden" name="unit_no" value={unitNo} />
      <input type="hidden" name="levy_id" value={levyId} />

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
          <label className="block text-xs font-semibold text-gray-700 mb-1">Amount paid (₱)</label>
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
            defaultValue="cash"
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
            defaultValue="admin_office"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white"
          >
            <option value="admin_office">Admin office</option>
            <option value="bank">Bank</option>
          </select>
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
