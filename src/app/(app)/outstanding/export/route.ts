import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// CSV export: unit_no + name + financial figures ONLY — never contact
// details, per "payment exports contain unit no + name only, no contact
// details." Pulls from resident_report_directory, which structurally
// cannot carry billing_contact_1/2 or dues_override.
function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: NextRequest) {
  await requireRole(["super_admin", "admin", "report_generator"]);

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period")?.trim() || "";
  const filter = searchParams.get("filter") ?? "all";

  const supabase = await createClient();

  const { data: directory } = await supabase
    .from("resident_report_directory")
    .select("id, unit_no, name, status")
    .eq("status", "active")
    .returns<{ id: string; unit_no: string; name: string; status: string }[]>();

  const { data: billings } = await supabase.from("billings").select("resident_id, amount").eq("period", period);
  const expectedByResident = Object.fromEntries((billings ?? []).map((b) => [b.resident_id, Number(b.amount)]));

  const { data: payments } = await supabase
    .from("payments")
    .select("resident_id, amount")
    .eq("period", period)
    .eq("status", "active");
  const paidByResident = new Map<string, number>();
  for (const p of payments ?? []) {
    paidByResident.set(p.resident_id, (paidByResident.get(p.resident_id) ?? 0) + Number(p.amount));
  }

  let rows = (directory ?? [])
    .filter((d) => expectedByResident[d.id] !== undefined)
    .map((d) => {
      const expected = expectedByResident[d.id];
      const paid = paidByResident.get(d.id) ?? 0;
      const balance = expected - paid;
      const status = balance <= 0.005 ? "Paid" : paid > 0 ? "Partial" : "Unpaid";
      return { unit_no: d.unit_no, name: d.name, expected, paid, balance, status };
    })
    .sort((a, b) => a.unit_no.localeCompare(b.unit_no));

  if (filter === "unpaid") {
    rows = rows.filter((r) => r.balance > 0.005);
  }

  const header = ["Unit", "Name", "Expected", "Paid", "Balance", "Status"];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [r.unit_no, r.name, r.expected.toFixed(2), r.paid.toFixed(2), r.balance.toFixed(2), r.status]
        .map(csvCell)
        .join(","),
    ),
  ];

  const filename = `outstanding-${period.replace(/\s+/g, "-") || "report"}.csv`;

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
