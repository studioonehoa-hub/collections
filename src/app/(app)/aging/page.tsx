import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatPhp } from "@/lib/format";
import { AGING_BUCKET_LABELS, buildAgingReport } from "@/lib/aging";

export default async function AgingPage() {
  await requireRole(["super_admin", "admin", "report_generator"]);
  const supabase = await createClient();

  const { rows, bucketTotals, grandTotal } = await buildAgingReport(supabase);

  return (
    <section>
      <h2 className="text-[17px] font-semibold text-gray-100">Aging Report</h2>
      <p className="text-gray-400 text-[12.5px] mb-4">
        Unpaid regular dues by bill age, oldest-bill-first — excludes levies. Units with nothing unpaid aren&apos;t
        listed.
      </p>

      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div
          className="text-[12.5px] text-gray-400"
          title="Sum of every bucket below — should always equal the total unpaid regular dues across all periods and all units."
        >
          Total unpaid: <span className="text-gray-100 font-semibold">{formatPhp(grandTotal)}</span> across{" "}
          {rows.length} units
        </div>
        <Link href="/aging/export" className="border border-neutral-600 px-3 py-1.5 text-xs font-semibold">
          ⬇ Export CSV
        </Link>
      </div>

      <div className="bg-neutral-800 border border-neutral-700 overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400 border-b border-neutral-700">
              <th className="px-3 py-2 sticky left-0 bg-neutral-800">Unit</th>
              <th className="px-3 py-2 sticky left-[64px] bg-neutral-800">Name</th>
              {AGING_BUCKET_LABELS.map((label) => (
                <th
                  key={label}
                  className="px-3 py-2 text-right whitespace-nowrap"
                  title={
                    label === "360+"
                      ? "Bills more than 360 days past their billing period."
                      : `Bills ${label} days past their billing period.`
                  }
                >
                  {label}d
                </th>
              ))}
              <th className="px-3 py-2 text-right whitespace-nowrap">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.unit_no}-${r.name}`} className="border-b border-neutral-700 last:border-0">
                <td className="px-3 py-2 sticky left-0 bg-neutral-800">{r.unit_no}</td>
                <td className="px-3 py-2 sticky left-[64px] bg-neutral-800">{r.name}</td>
                {r.buckets.map((v, i) => (
                  <td key={i} className="px-3 py-2 text-right tabular-nums">
                    {v > 0.005 ? formatPhp(v) : <span className="text-gray-600">—</span>}
                  </td>
                ))}
                <td className="px-3 py-2 text-right tabular-nums font-semibold">{formatPhp(r.total)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={AGING_BUCKET_LABELS.length + 3} className="px-3 py-6 text-center text-gray-400">
                  Nothing unpaid — every billed unit is fully covered.
                </td>
              </tr>
            )}
            {rows.length > 0 && (
              <tr>
                <td className="px-3 py-2 font-semibold sticky left-0 bg-neutral-800">Total</td>
                <td className="px-3 py-2 sticky left-[64px] bg-neutral-800" />
                {bucketTotals.map((v, i) => (
                  <td key={i} className="px-3 py-2 text-right tabular-nums font-semibold">
                    {formatPhp(v)}
                  </td>
                ))}
                <td className="px-3 py-2 text-right tabular-nums font-semibold">{formatPhp(grandTotal)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
