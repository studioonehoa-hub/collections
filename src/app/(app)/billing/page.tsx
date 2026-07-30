import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { currentPeriod, formatDate, formatPhp } from "@/lib/format";
import type { BillingRow, DuesGroupSummaryRow } from "@/lib/types";
import { generateBillingRun, markBillingReceived, markBillingSent } from "./actions";

const SENT_VIA_OPTIONS = ["email", "sms", "printed", "hand_delivered"] as const;
const RECEIVED_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  received: "Received",
  acknowledged: "Acknowledged",
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; filter?: string }>;
}) {
  await requireRole(["super_admin", "admin"]);
  const { period: periodParam, filter } = await searchParams;
  const period = periodParam?.trim() || currentPeriod();
  const supabase = await createClient();

  const { data: groups } = await supabase
    .from("dues_group_summary")
    .select("id, name, monthly_amount, member_count")
    .order("name")
    .returns<DuesGroupSummaryRow[]>();

  const { data: billingsRaw } = await supabase
    .from("billings")
    .select("id, resident_id, period, amount, sent_via, sent_at, received_status, received_at")
    .eq("period", period)
    .returns<BillingRow[]>();

  const residentIds = (billingsRaw ?? []).map((b) => b.resident_id);
  const { data: directory } = residentIds.length
    ? await supabase.from("resident_report_directory").select("id, unit_no, name").in("id", residentIds)
    : { data: [] as { id: string; unit_no: string; name: string }[] };
  const directoryById = Object.fromEntries((directory ?? []).map((d) => [d.id, d]));

  let billings = (billingsRaw ?? [])
    .map((b) => ({
      ...b,
      unit_no: directoryById[b.resident_id]?.unit_no ?? "—",
      name: directoryById[b.resident_id]?.name ?? "—",
    }))
    .sort((a, b) => a.unit_no.localeCompare(b.unit_no));

  if (filter === "not_sent") billings = billings.filter((b) => !b.sent_at);
  if (filter === "not_received") billings = billings.filter((b) => b.received_status === "pending");

  const totalCount = billingsRaw?.length ?? 0;
  const totalBilled = (billingsRaw ?? []).reduce((sum, b) => sum + Number(b.amount), 0);
  const sentCount = (billingsRaw ?? []).filter((b) => b.sent_at).length;
  const receivedCount = (billingsRaw ?? []).filter((b) => b.received_status !== "pending").length;

  return (
    <section>
      <h2 className="text-[17px] font-semibold text-gray-100">Billing</h2>
      <p className="text-gray-400 text-[12.5px] mb-4">
        {period} billing run · amounts from dues groups (or per-resident override)
      </p>

      <div className="grid gap-3 sm:grid-cols-3 mb-4">
        <Card k="Billed" v={formatPhp(totalBilled)} d={`${totalCount} units`} />
        <Card k="Sent" v={`${sentCount} / ${totalCount}`} d={`${totalCount - sentCount} pending dispatch`} />
        <Card k="Received / ack'd" v={`${receivedCount} / ${sentCount}`} />
      </div>

      <div className="bg-neutral-800 border border-neutral-700 p-4 mb-4">
        <h3 className="text-sm font-semibold mb-3">Dues groups</h3>
        <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400 border-b border-neutral-700">
              <th className="px-3 py-2">Group</th>
              <th className="px-3 py-2 text-right">Monthly amount</th>
              <th className="px-3 py-2 text-right">Members</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {(groups ?? []).map((g) => (
              <tr key={g.id} className="border-b border-neutral-700 last:border-0">
                <td className="px-3 py-2">{g.name}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatPhp(Number(g.monthly_amount))}</td>
                <td className="px-3 py-2 text-right tabular-nums">{g.member_count}</td>
                <td className="px-3 py-2">
                  <Link
                    href={`/billing/groups/${g.id}/edit`}
                    className="border border-neutral-600 px-2.5 py-1 text-xs"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {(!groups || groups.length === 0) && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-gray-400">
                  No dues groups yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
        <div className="mt-3">
          <Link
            href="/billing/groups/new"
            className="border border-neutral-600 px-3 py-1.5 text-xs font-semibold"
          >
            + Add group
          </Link>
        </div>
      </div>

      <div className="bg-neutral-800 border border-neutral-700 p-4">
        <h3 className="text-sm font-semibold mb-3">Billing run — {period}</h3>

        <div className="flex gap-2 flex-wrap items-center mb-3">
          <form method="GET" className="flex gap-2 items-center">
            <input
              name="period"
              defaultValue={period}
              placeholder="e.g. Jul 2026"
              className="max-w-[140px] border border-neutral-600 bg-neutral-950 px-3 py-2 text-sm text-gray-100 outline-none focus:border-neutral-400"
            />
            <select
              name="filter"
              defaultValue={filter ?? "all"}
              className="border border-neutral-600 px-3 py-2 text-sm text-gray-100 bg-neutral-950"
            >
              <option value="all">All</option>
              <option value="not_sent">Not sent</option>
              <option value="not_received">Not received</option>
            </select>
            <button type="submit" className="border border-neutral-600 px-3 py-2 text-sm font-semibold">
              View
            </button>
          </form>

          <form action={generateBillingRun}>
            <input type="hidden" name="period" value={period} />
            <button type="submit" className="bg-neutral-100 text-neutral-900 text-sm font-semibold px-4 py-2">
              Generate bills for {period}
            </button>
          </form>
        </div>

        <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400 border-b border-neutral-700">
              <th className="px-3 py-2">Unit</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2 text-right">Amount</th>
              <th className="px-3 py-2">Sent</th>
              <th className="px-3 py-2">Received</th>
            </tr>
          </thead>
          <tbody>
            {billings.map((b) => (
              <tr key={b.id} className="border-b border-neutral-700 last:border-0">
                <td className="px-3 py-2">{b.unit_no}</td>
                <td className="px-3 py-2">{b.name}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatPhp(Number(b.amount))}</td>
                <td className="px-3 py-2">
                  {b.sent_at ? (
                    <span>
                      {b.sent_via} · {formatDate(b.sent_at)}
                    </span>
                  ) : (
                    <form action={markBillingSent} className="flex gap-1.5 items-center">
                      <input type="hidden" name="billing_id" value={b.id} />
                      <select
                        name="sent_via"
                        required
                        className="border border-neutral-600 px-1.5 py-1 text-xs text-gray-100 bg-neutral-950"
                      >
                        {SENT_VIA_OPTIONS.map((v) => (
                          <option key={v} value={v}>
                            {v.replace("_", " ")}
                          </option>
                        ))}
                      </select>
                      <button type="submit" className="border border-neutral-600 px-2 py-1 text-xs">
                        Mark sent
                      </button>
                    </form>
                  )}
                </td>
                <td className="px-3 py-2">
                  {b.received_status !== "pending" ? (
                    <span className="inline-block bg-emerald-900/40 text-emerald-300 text-[11px] px-2 py-0.5">
                      {RECEIVED_STATUS_LABEL[b.received_status]}
                      {b.received_at ? ` ${formatDate(b.received_at)}` : ""}
                    </span>
                  ) : b.sent_at ? (
                    <form action={markBillingReceived} className="flex gap-1.5 items-center">
                      <input type="hidden" name="billing_id" value={b.id} />
                      <select
                        name="received_status"
                        required
                        className="border border-neutral-600 px-1.5 py-1 text-xs text-gray-100 bg-neutral-950"
                      >
                        <option value="received">Received</option>
                        <option value="acknowledged">Acknowledged</option>
                      </select>
                      <button type="submit" className="border border-neutral-600 px-2 py-1 text-xs">
                        Mark received
                      </button>
                    </form>
                  ) : (
                    <span className="inline-block bg-red-900/40 text-red-300 text-[11px] px-2 py-0.5">
                      Pending
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {billings.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-gray-400">
                  No bills for {period} yet. Generate the run above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </section>
  );
}

function Card({ k, v, d }: { k: string; v: string; d?: string }) {
  return (
    <div className="bg-neutral-800 border border-neutral-700 p-3.5">
      <div className="text-[11px] uppercase tracking-wide text-gray-400">{k}</div>
      <div className="text-[22px] font-bold mt-1">{v}</div>
      {d && <div className="text-[11.5px] text-gray-400 mt-0.5">{d}</div>}
    </div>
  );
}
