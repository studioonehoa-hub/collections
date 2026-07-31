import { formatDate, formatPhp } from "./format";

export type BillData = {
  unitNo: string;
  name: string;
  period: string;
  amount: number;
};

/** Fuller, letter-style bill text for email. */
export function buildEmailBill(b: BillData, asOf: Date = new Date()): string {
  return `Dear ${b.name},

This is your dues bill for ${b.period}.

Unit: ${b.unitNo}
Period: ${b.period}
Amount Due: ${formatPhp(b.amount)}
Statement Date: ${formatDate(asOf)}

Please settle at your earliest convenience. If you have already paid, kindly disregard this notice.

Thank you,
Koolector — Billing and Collections`;
}

/** Short bill text for SMS — always well under the 320-character limit. */
export function buildSmsBill(b: BillData): string {
  return `Koolector: Unit ${b.unitNo} dues for ${b.period} is ${formatPhp(b.amount)}. Please settle soon. Thank you.`;
}
