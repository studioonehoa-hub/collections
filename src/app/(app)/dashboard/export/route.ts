import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Same "unit + name + financial columns only, never contacts" rule as the
// Outstanding export — see that route for the full rationale.
function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: NextRequest) {
  await requireRole(["super_admin", "admin", "report_generator"]);

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") ?? ""; // "YYYY-MM"
  const [year, mon] = month.split("-").map(Number);
  const monthStart = `${month}-01`;
  const monthEnd = new Date(year, mon, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  const monthEndStr = `${monthEnd.getFullYear()}-${pad(monthEnd.getMonth() + 1)}-${pad(monthEnd.getDate())}`;

  const supabase = await createClient();

  const { data: directory } = await supabase
    .from("resident_report_directory")
    .select("id, unit_no, name")
    .returns<{ id: string; unit_no: string; name: string }[]>();
  const nameByResident = Object.fromEntries((directory ?? []).map((d) => [d.id, d]));

  const { data: payments } = await supabase
    .from("payments")
    .select("resident_id, date, amount, mode, received_by")
    .eq("status", "active")
    .gte("date", monthStart)
    .lte("date", monthEndStr);
  const { data: specialPayments } = await supabase
    .from("special_payments")
    .select("resident_id, date, amount, mode, received_by")
    .eq("status", "active")
    .gte("date", monthStart)
    .lte("date", monthEndStr);

  const rows = [
    ...(payments ?? []).map((p) => ({ ...p, type: "Monthly" })),
    ...(specialPayments ?? []).map((p) => ({ ...p, type: "Levy" })),
  ].sort((a, b) => (a.date < b.date ? -1 : 1));

  const header = ["Date", "Unit", "Name", "Type", "Mode", "Received By", "Amount"];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        r.date,
        nameByResident[r.resident_id]?.unit_no ?? "",
        nameByResident[r.resident_id]?.name ?? "",
        r.type,
        r.mode,
        r.received_by,
        Number(r.amount).toFixed(2),
      ]
        .map(csvCell)
        .join(","),
    ),
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="collections-${month}.csv"`,
    },
  });
}
