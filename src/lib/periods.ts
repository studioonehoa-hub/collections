import type { SupabaseClient } from "@supabase/supabase-js";
import { addMonths, currentPeriod, parsePeriod } from "./format";

/**
 * Every period that has an existing billing run, chronologically sorted,
 * plus the next upcoming period after the latest one (or the current month
 * if there are no billing runs yet) — the full set of periods a dropdown
 * should offer. Replaces free-text period entry, which invited typos that
 * silently produced empty results.
 */
export async function getValidPeriods(supabase: SupabaseClient): Promise<string[]> {
  const { data } = await supabase.from("billings").select("period");
  const distinct = [...new Set((data ?? []).map((r) => r.period as string))];

  distinct.sort((a, b) => {
    const da = parsePeriod(a);
    const db = parsePeriod(b);
    if (!da || !db) return a.localeCompare(b);
    return da.getTime() - db.getTime();
  });

  const latest = distinct[distinct.length - 1];
  const next = latest ? addMonths(latest, 1) : currentPeriod();
  if (!distinct.includes(next)) distinct.push(next);

  return distinct;
}
