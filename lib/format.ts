const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-06-11" -> "11 Jun"; null -> "TBD". */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "TBD";
  const p = iso.split("-");
  if (p.length < 3) return iso;
  return `${parseInt(p[2], 10)} ${MONTHS[parseInt(p[1], 10)]}`;
}

// All kickoff times are shown in UK time; Europe/London handles BST automatically.
const UK_DATE = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short" });
const UK_TIME = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", hour12: false });

/** Kickoff date + UK time from an ISO timestamp. Falls back to the placeholder
 *  date (time null) until the real kickoff is synced from the API. */
export function fmtKickoffUK(
  kickoff: string | null | undefined,
  fallbackDate: string | null | undefined
): { date: string; time: string | null } {
  if (kickoff) {
    const d = new Date(kickoff);
    if (!Number.isNaN(d.getTime())) {
      return { date: UK_DATE.format(d), time: UK_TIME.format(d) };
    }
  }
  return { date: fmtDate(fallbackDate), time: null };
}

/** Sortable epoch for a fixture's kickoff (or placeholder date). */
export function kickoffSortKey(kickoff: string | null | undefined, date: string | null | undefined): number {
  const v = kickoff || date;
  if (!v) return 0;
  const n = new Date(v).getTime();
  return Number.isNaN(n) ? 0 : n;
}
