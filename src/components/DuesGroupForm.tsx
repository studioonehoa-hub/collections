"use client";

import { useActionState } from "react";

export type DuesGroupFormState = { error: string | null };

export function DuesGroupForm({
  action,
  defaults,
  submitLabel,
}: {
  action: (state: DuesGroupFormState, formData: FormData) => Promise<DuesGroupFormState>;
  defaults?: { id?: string; name?: string; monthly_amount?: string };
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });

  return (
    <form action={formAction} className="bg-white border border-gray-200 rounded-xl p-4">
      {defaults?.id && <input type="hidden" name="id" defaultValue={defaults.id} />}

      {state.error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
          {state.error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 mb-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Name</label>
          <input
            name="name"
            required
            defaultValue={defaults?.name}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-700"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Monthly amount (₱)</label>
          <input
            name="monthly_amount"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={defaults?.monthly_amount}
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
