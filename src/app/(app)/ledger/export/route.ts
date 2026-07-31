import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { PaymentRow, ResidentRow, SpecialPaymentRow } from "@/lib/types";

// Same "unit + name + financial columns only, never contacts" rule as the
// other exports. Scoped to one resident (already identified by exact
// lookup to get here), so unit/name repeat per row same as the on-screen
// table, not a bulk roster.
function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: NextRequest) {
  await requireRole(["super_admin", "admin", "encoder", "report_generator"]);

  const { searchParams } = new URL(request.url);
  const unit = searchParams.get("unit")?.trim() ?? "";

  const supabase = await createClient();

  const { data: lookupRows } = await supabase.rpc("resident_lookup", { p_query: unit });
  const resident = (lookupRows?.[0] as ResidentRow | undefined) ?? null;

  if (!resident) {
    return new Response("Resident not found for that exact unit/name.", { status: 404 });
  }

  const [{ data: payments }, { data: specialPayments }] = await Promise.all([
    supabase
      .from("payments")
      .select("date, amount, mode, received_by, period, status, void_reason")
      .eq("resident_id", resident.id)
      .returns<PaymentRow[]>(),
    supabase
      .from("special_payments")
      .select("date, amount, mode, received_by, levy_id, status, void_reason")
      .eq("resident_id", resident.id)
      .returns<SpecialPaymentRow[]>(),
  ]);

  const levyIds = [...new Set((specialPayments ?? []).map((s) => s.levy_id))];
  const { data: levies } = levyIds.length
    ? await supabase.from("levies").select("id, name").in("id", levyIds)
    : { data: [] as { id: string; name: string }[] };
  const levyNameById = Object.fromEntries((levies ?? []).map((l) => [l.id, l.name]));

  const rows = [
    ...(payments ?? []).map((p) => ({
      date: p.date,
      type: "Monthly",
      label: p.period ?? "",
      mode: p.mode,
      receivedBy: p.received_by,
      amount: Number(p.amount),
      status: p.status,
      voidReason: p.void_reason ?? "",
    })),
    ...(specialPayments ?? []).map((s) => ({
      date: s.date,
      type: "Levy",
      label: levyNameById[s.levy_id] ?? "",
      mode: s.mode,
      receivedBy: s.received_by,
      amount: Number(s.amount),
      status: s.status,
      voidReason: s.void_reason ?? "",
    })),
  ].sort((a, b) => (a.date < b.date ? -1 : 1));

  const totalActive = rows.filter((r) => r.status === "active").reduce((sum, r) => sum + r.amount, 0);

  const header = ["Unit", "Name", "Date", "Type", "Period / Levy", "Mode", "Received By", "Amount", "Status", "Void Reason"];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        resident.unit_no,
        resident.name,
        r.date,
        r.type,
        r.label,
        r.mode,
        r.receivedBy,
        r.amount.toFixed(2),
        r.status,
        r.voidReason,
      ]
        .map(csvCell)
        .join(","),
    ),
    // Active entries only — voided rows are excluded from this sum, same as
    // every on-screen aggregate (Paid YTD, Outstanding, Dashboard).
    [
      "Total (active entries only, all-time)",
      "",
      "",
      "",
      "",
      "",
      "",
      totalActive.toFixed(2),
      "",
      "",
    ]
      .map(csvCell)
      .join(","),
  ];

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ledger-${resident.unit_no}.csv"`,
    },
  });
}
