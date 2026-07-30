"use client";

import { useActionState } from "react";
import type { DuesGroupRow, ResidentRow } from "@/lib/types";

export type ResidentFormState = { error: string | null };

type Defaults = Partial<
  Pick<
    ResidentRow,
    | "id"
    | "name"
    | "unit_no"
    | "dues_group_id"
    | "dues_override"
    | "billing_contact_1"
    | "billing_contact_2"
    | "status"
  >
>;

export function ResidentForm({
  action,
  duesGroups,
  defaults,
  submitLabel,
  showStatus = false,
}: {
  action: (state: ResidentFormState, formData: FormData) => Promise<ResidentFormState>;
  duesGroups: DuesGroupRow[];
  defaults?: Defaults;
  submitLabel: string;
  showStatus?: boolean;
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
          <label className="block text-xs font-semibold text-gray-300 mb-1">Unit no.</label>
          <input
            name="unit_no"
            required
            defaultValue={defaults?.unit_no}
            className="w-full border border-neutral-600 bg-neutral-950 px-3 py-2 text-sm text-gray-100 outline-none focus:border-neutral-400"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1">Dues group</label>
          <select
            name="dues_group_id"
            required
            defaultValue={defaults?.dues_group_id ?? ""}
            className="w-full border border-neutral-600 px-3 py-2 text-sm text-gray-100 bg-neutral-950"
          >
            <option value="" disabled>
              Select a group…
            </option>
            {duesGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} — ₱
                {Number(g.monthly_amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1">
            Dues override (optional)
          </label>
          <input
            name="dues_override"
            type="number"
            step="0.01"
            min="0"
            defaultValue={defaults?.dues_override ?? ""}
            placeholder="Beats the group amount if set"
            className="w-full border border-neutral-600 bg-neutral-950 px-3 py-2 text-sm text-gray-100 outline-none focus:border-neutral-400"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1">
            Billing contact 1
          </label>
          <input
            name="billing_contact_1"
            defaultValue={defaults?.billing_contact_1 ?? ""}
            className="w-full border border-neutral-600 bg-neutral-950 px-3 py-2 text-sm text-gray-100 outline-none focus:border-neutral-400"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1">
            Billing contact 2
          </label>
          <input
            name="billing_contact_2"
            defaultValue={defaults?.billing_contact_2 ?? ""}
            className="w-full border border-neutral-600 bg-neutral-950 px-3 py-2 text-sm text-gray-100 outline-none focus:border-neutral-400"
          />
        </div>

        {showStatus && (
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Status</label>
            <select
              name="status"
              defaultValue={defaults?.status ?? "active"}
              className="w-full border border-neutral-600 px-3 py-2 text-sm text-gray-100 bg-neutral-950"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        )}
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
