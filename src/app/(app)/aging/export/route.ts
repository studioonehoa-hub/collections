import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AGING_BUCKET_LABELS, buildAgingReport } from "@/lib/aging";

// Same "unit + name + financial columns only, never contacts" rule as the
// other exports — buildAgingReport() pulls resident identity exclusively
// from resident_report_directory, which structurally cannot carry contacts.
function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  await requireRole(["super_admin", "admin", "report_generator"]);

  const supabase = await createClient();
  const { rows, bucketTotals, grandTotal } = await buildAgingReport(supabase);

  const header = ["Unit", "Name", ...AGING_BUCKET_LABELS.map((l) => `${l}d`), "Total"];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [r.unit_no, r.name, ...r.buckets.map((v) => v.toFixed(2)), r.total.toFixed(2)].map(csvCell).join(","),
    ),
    // Same totals row shown on-screen.
    [`Total (${rows.length} units)`, "", ...bucketTotals.map((v) => v.toFixed(2)), grandTotal.toFixed(2)]
      .map(csvCell)
      .join(","),
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="aging-report.csv"`,
    },
  });
}
