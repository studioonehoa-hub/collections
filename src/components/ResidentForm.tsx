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
          <label className="block text-xs font-semibold text-gray-700 mb-1">Unit no.</label>
          <input
            name="unit_no"
            required
            defaultValue={defaults?.unit_no}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-700"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Dues group</label>
          <select
            name="dues_group_id"
            required
            defaultValue={defaults?.dues_group_id ?? ""}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white"
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
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Dues override (optional)
          </label>
          <input
            name="dues_override"
            type="number"
            step="0.01"
            min="0"
            defaultValue={defaults?.dues_override ?? ""}
            placeholder="Beats the group amount if set"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-700"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Billing contact 1
          </label>
          <input
            name="billing_contact_1"
            defaultValue={defaults?.billing_contact_1 ?? ""}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-700"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Billing contact 2
          </label>
          <input
            name="billing_contact_2"
            defaultValue={defaults?.billing_contact_2 ?? ""}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-700"
          />
        </div>

        {showStatus && (
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
            <select
              name="status"
              defaultValue={defaults?.status ?? "active"}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white"
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
        className="rounded-lg bg-blue-700 text-white text-sm font-semibold px-4 py-2 disabled:opacity-50"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
