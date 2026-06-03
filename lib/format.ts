const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-06-11" -> "11 Jun"; null -> "TBD". */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "TBD";
  const p = iso.split("-");
  if (p.length < 3) return iso;
  return `${parseInt(p[2], 10)} ${MONTHS[parseInt(p[1], 10)]}`;
}
