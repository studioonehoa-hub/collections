import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { currentPeriod } from "@/lib/format";
import { buildEmailBill, buildSmsBill } from "@/lib/bills";
import { BillCard } from "@/components/BillCard";
import { BulkBillActions } from "@/components/BulkBillActions";

export default async function BillsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  await requireRole(["super_admin", "admin"]);
  const { period: periodParam } = await searchParams;
  const period = periodParam?.trim() || currentPeriod();
  const supabase = await createClient();

  const { data: billingsRaw } = await supabase
    .from("billings")
    .select("id, resident_id, period, amount")
    .eq("period", period);

  const residentIds = (billingsRaw ?? []).map((b) => b.resident_id);
  const { data: directory } = residentIds.length
    ? await supabase.from("resident_report_directory").select("id, unit_no, name").in("id", residentIds)
    : { data: [] as { id: string; unit_no: string; name: string }[] };
  const directoryById = Object.fromEntries((directory ?? []).map((d) => [d.id, d]));

  const asOf = new Date();
  const bills = (billingsRaw ?? [])
    .map((b) => {
      const d = directoryById[b.resident_id];
      const data = { unitNo: d?.unit_no ?? "—", name: d?.name ?? "—", period: b.period, amount: Number(b.amount) };
      return {
        id: b.id,
        ...data,
        email: buildEmailBill(data, asOf),
        sms: buildSmsBill(data),
      };
    })
    .sort((a, b) => a.unitNo.localeCompare(b.unitNo));

  return (
    <section>
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h2 className="text-[17px] font-semibold text-gray-100">Bills — {period}</h2>
        <Link href={`/billing?period=${encodeURIComponent(period)}`} className="text-xs text-gray-400 underline">
          ← Back to Billing
        </Link>
      </div>
      <p className="text-gray-400 text-[12.5px] mb-4">
        Preview only — nothing is sent from here. Copy a bill&apos;s text into your own email/SMS tool, or copy/
        download the whole run below.
      </p>

      <div className="bg-neutral-800 border border-neutral-700 p-4 mb-4">
        <BulkBillActions
          bills={bills.map((b) => ({ unitNo: b.unitNo, name: b.name, email: b.email, sms: b.sms }))}
          period={period}
        />
      </div>

      <div className="space-y-3">
        {bills.map((b) => (
          <BillCard key={b.id} billingId={b.id} unitNo={b.unitNo} name={b.name} email={b.email} sms={b.sms} />
        ))}
        {bills.length === 0 && (
          <div className="bg-neutral-800 border border-neutral-700 px-4 py-6 text-center text-gray-400 text-sm">
            No bills for {period} yet. Generate the run on the Billing screen first.
          </div>
        )}
      </div>
    </section>
  );
}
