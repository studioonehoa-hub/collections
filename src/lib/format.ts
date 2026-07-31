const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatPhp(amount: number) {
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount);
}

/** "Jul 2026" — the period label format used throughout (billings.period, levy displays). */
export function formatPeriod(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function currentPeriod(): string {
  return formatPeriod(new Date());
}

/**
 * Parses a "Jul 2026"-style period back into a Date (first of that month),
 * for chronological comparison/sorting — period strings don't sort correctly
 * as plain text ("Jan 2027" < "Feb 2026" alphabetically, which is wrong).
 * Returns null for anything not in the exact format this app itself writes.
 */
export function parsePeriod(period: string): Date | null {
  const match = /^([A-Za-z]{3}) (\d{4})$/.exec(period.trim());
  if (!match) return null;
  const monthIndex = MONTHS.indexOf(match[1] as (typeof MONTHS)[number]);
  if (monthIndex === -1) return null;
  return new Date(Number(match[2]), monthIndex, 1);
}

export function addMonths(period: string, count: number): string {
  const parsed = parsePeriod(period);
  const base = parsed ?? new Date();
  return formatPeriod(new Date(base.getFullYear(), base.getMonth() + count, 1));
}

/**
 * "16 Jul 2026" — the DD MMM YYYY date format required throughout the app.
 * Accepts either a plain "date" column value ("2026-07-16", no time — gets
 * "T00:00:00" appended so it parses as local midnight instead of shifting a
 * day when read in a negative-UTC-offset timezone) or a full timestamptz
 * string ("2026-07-16T06:08:34.364+00:00", e.g. voided_at) — those already
 * carry a "T", so appending another one would double it up and produce an
 * unparseable string (silently rendering "NaN undefined NaN").
 */
export function formatDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value.includes("T") ? value : `${value}T00:00:00`) : value;
  const dd = String(d.getDate()).padStart(2, "0");
  return `${dd} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
