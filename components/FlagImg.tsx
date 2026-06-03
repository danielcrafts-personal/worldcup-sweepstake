import { flagUrl, type FlagSize } from "@/lib/flags";

export function FlagImg({
  team,
  size = "w40",
  className = "",
}: {
  team: string | null | undefined;
  size?: FlagSize;
  className?: string;
}) {
  const url = flagUrl(team, size);
  if (!url) return <span className={`flag ${className}`} aria-hidden>🏳️</span>;
  const url2x = flagUrl(team, size === "w40" ? "w80" : "w160");
  return (
    <img
      className={`flag ${className}`}
      src={url}
      srcSet={url2x ? `${url2x} 2x` : undefined}
      alt=""
      loading="lazy"
    />
  );
}
