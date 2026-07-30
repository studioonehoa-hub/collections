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
    <form action={formAction} className="bg-neutral-800 border border-neutral-700 p-4">
      {defaults?.id && <input type="hidden" name="id" defaultValue={defaults.id} />}

      {state.error && (
        <div className="mb-4 bg-red-900/30 border border-red-800 text-red-300 text-sm px-3 py-2">
          {state.error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 mb-4">
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1">Name</label>
          <input
            name="name"
            required
            defaultValue={defaults?.name}
            className="w-full border border-neutral-600 bg-neutral-950 px-3 py-2 text-sm text-gray-100 outline-none focus:border-neutral-400"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1">Monthly amount (₱)</label>
          <input
            name="monthly_amount"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={defaults?.monthly_amount}
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
