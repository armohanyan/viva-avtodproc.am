/** RFC 4180-style CSV cell escaping for Excel and generic CSV readers. */
export function escapeCsvCell(value: string): string {
  const s = String(value ?? "");
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildCsv(headers: string[], rows: string[][]): string {
  const line = (cells: string[]) => cells.map(escapeCsvCell).join(",");
  const body = [line(headers), ...rows.map(line)].join("\r\n");
  return `\uFEFF${body}`;
}

export function downloadCsvFile(filename: string, csv: string): void {
  const name = filename.toLowerCase().endsWith(".csv") ? filename : `${filename}.csv`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
