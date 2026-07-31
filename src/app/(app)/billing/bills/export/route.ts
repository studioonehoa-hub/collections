import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { buildEmailBill, buildSmsBill } from "@/lib/bills";

const SEPARATOR = "\n\n----------------------------------------\n\n";

export async function GET(request: NextRequest) {
  await requireRole(["super_admin", "admin"]);

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period")?.trim() ?? "";
  const format = searchParams.get("format") === "sms" ? "sms" : "email";

  const supabase = await createClient();

  const { data: billingsRaw } = await supabase
    .from("billings")
    .select("resident_id, period, amount")
    .eq("period", period);

  const residentIds = (billingsRaw ?? []).map((b) => b.resident_id);
  const { data: directory } = residentIds.length
    ? await supabase.from("resident_report_directory").select("id, unit_no, name").in("id", residentIds)
    : { data: [] as { id: string; unit_no: string; name: string }[] };
  const directoryById = Object.fromEntries((directory ?? []).map((d) => [d.id, d]));

  const asOf = new Date();
  const rows = (billingsRaw ?? [])
    .map((b) => {
      const d = directoryById[b.resident_id];
      return { unitNo: d?.unit_no ?? "—", name: d?.name ?? "—", period: b.period, amount: Number(b.amount) };
    })
    .sort((a, b) => a.unitNo.localeCompare(b.unitNo));

  const text = rows
    .map((r) => {
      const body = format === "sms" ? buildSmsBill(r) : buildEmailBill(r, asOf);
      return `${r.unitNo} — ${r.name}\n\n${body}`;
    })
    .join(SEPARATOR);

  const filename = `bills-${format}-${period.replace(/\s+/g, "-") || "period"}.txt`;

  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
