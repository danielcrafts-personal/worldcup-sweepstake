// Team -> ISO 3166 code, used to render real flag images from flagcdn.com.
// (Emoji flags don't render on Windows, so we use images everywhere.)
// England/Scotland use GB subdivision codes, which flagcdn supports.
export const FLAG_ISO: Record<string, string> = {
  Mexico: "mx", "South Africa": "za", "South Korea": "kr", Czechia: "cz",
  Canada: "ca", "Bosnia and Herzegovina": "ba", Qatar: "qa", Switzerland: "ch",
  Brazil: "br", Morocco: "ma", Haiti: "ht", Scotland: "gb-sct",
  "United States": "us", Paraguay: "py", Australia: "au", "Türkiye": "tr",
  Germany: "de", "Curaçao": "cw", "Ivory Coast": "ci", Ecuador: "ec",
  Netherlands: "nl", Japan: "jp", Sweden: "se", Tunisia: "tn",
  Belgium: "be", Egypt: "eg", Iran: "ir", "New Zealand": "nz",
  Spain: "es", "Cape Verde": "cv", "Saudi Arabia": "sa", Uruguay: "uy",
  France: "fr", Senegal: "sn", Iraq: "iq", Norway: "no",
  Argentina: "ar", Algeria: "dz", Austria: "at", Jordan: "jo",
  Portugal: "pt", "DR Congo": "cd", Uzbekistan: "uz", Colombia: "co",
  England: "gb-eng", Croatia: "hr", Ghana: "gh", Panama: "pa",
};

export type FlagSize = "w20" | "w40" | "w80" | "w160";

/** Returns the flagcdn URL for a team, or null if we don't have a code. */
export function flagUrl(team: string | null | undefined, size: FlagSize = "w40"): string | null {
  if (!team) return null;
  const code = FLAG_ISO[team];
  return code ? `https://flagcdn.com/${size}/${code}.png` : null;
}
