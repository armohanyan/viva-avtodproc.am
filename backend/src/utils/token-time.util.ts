/** Parse `15m`-style duration to milliseconds (fallback `fallbackUnit` when pattern invalid). */
export function parseDurationToMs(raw: string, fallbackMs: number): number {
  const s = raw.trim();
  const m = /^(\d+)\s*([smhd])$/i.exec(s);
  if (!m) return fallbackMs;
  const n = Number(m[1]);
  const u = m[2]!.toLowerCase();
  const mult = u === 's' ? 1000 : u === 'm' ? 60_000 : u === 'h' ? 3_600_000 : 86_400_000;
  return n * mult;
}

/** Parse `15m`-style duration to seconds for JWT `expiresIn`. */
export function parseDurationToSeconds(raw: string, fallbackSeconds: number): number {
  return Math.max(1, Math.floor(parseDurationToMs(raw, fallbackSeconds * 1000) / 1000));
}
