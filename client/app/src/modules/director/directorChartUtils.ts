export type ChartPoint = { label: string; value: number };

export function monthKey(dateIso: string): string {
  return dateIso.slice(0, 7);
}

export function formatMonthLabel(key: string): string {
  const [y, m] = key.split("-");
  const months = ["Հնվ", "Փտվ", "Մար", "Ապր", "Մայ", "Հուն", "Հուլ", "Օգս", "Սեպ", "Հոկ", "Նոյ", "Դեկ"];
  const idx = Math.max(0, Math.min(11, Number(m) - 1));
  return `${months[idx] ?? m} ${y?.slice(2) ?? ""}`;
}

export function sumBy<T>(rows: readonly T[], keyFn: (row: T) => string, valueFn: (row: T) => number): ChartPoint[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = keyFn(row);
    map.set(key, (map.get(key) ?? 0) + valueFn(row));
  }
  return [...map.entries()]
    .map(([label, value]) => ({ label, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value);
}

export function sumByMonth<T>(rows: readonly T[], dateFn: (row: T) => string, valueFn: (row: T) => number): ChartPoint[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = monthKey(dateFn(row));
    map.set(key, (map.get(key) ?? 0) + valueFn(row));
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, value]) => ({ label: formatMonthLabel(label), value: Math.round(value * 100) / 100 }));
}

export function topN(points: ChartPoint[], n = 8): ChartPoint[] {
  return [...points].sort((a, b) => b.value - a.value).slice(0, n);
}

export function cumulativeBalance(
  rows: readonly { date: string; amount: number }[],
): ChartPoint[] {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  let balance = 0;
  return sorted.map((row) => {
    balance += row.amount;
    return { label: row.date, value: Math.round(balance) };
  });
}
