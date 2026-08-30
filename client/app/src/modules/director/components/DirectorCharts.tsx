import { ReactNode, useMemo } from "react";
import { BarChart3 } from "lucide-react";
import { cn } from "src/lib/utils";
import { useChartTheme, chartColorAt, getChartPrimaryColor } from "src/lib/chartTheme";
import type { ChartPoint } from "src/modules/director/directorChartUtils";
import { DirectorCard } from "src/modules/director/components/DirectorUi";
import { Bar, Doughnut, Line } from "./directorChartRegister";

export function DirectorReportSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-muted/20 p-5 md:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-primary shrink-0" />
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function DirectorReportGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-4 md:grid-cols-2", className)}>{children}</div>;
}

export function DirectorChartPanel({
  title,
  subtitle,
  children,
  className,
  tall,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  tall?: boolean;
}) {
  return (
    <DirectorCard className={cn("flex flex-col overflow-hidden", className)}>
      <div className="mb-3 shrink-0">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle ? <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p> : null}
      </div>
      <div
        className={cn(
          "relative w-full rounded-lg bg-muted/30 border border-border/60 p-3",
          tall ? "h-72" : "h-56",
        )}
      >
        {children}
      </div>
    </DirectorCard>
  );
}

export function DirectorChartEmpty({ message = "Այս ժամանակահատվածում տվյալներ չկան" }: { message?: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
      <BarChart3 className="w-8 h-8 opacity-40" />
      <p className="text-sm text-center px-4">{message}</p>
    </div>
  );
}

function withAlpha(color: string, alpha: number): string {
  if (color.startsWith("rgba")) return color;
  const m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(color);
  if (!m) return color;
  return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${alpha})`;
}

export function DirectorVerticalBarChart({
  points,
  label = "AMD",
  horizontal,
}: {
  points: ChartPoint[];
  label?: string;
  horizontal?: boolean;
}) {
  const theme = useChartTheme();
  if (points.length === 0) return <DirectorChartEmpty />;

  const data = {
    labels: points.map((p) => p.label),
    datasets: [
      {
        label,
        data: points.map((p) => p.value),
        backgroundColor: theme.barDatasetColors(points.length),
        borderColor: theme.colors.sliceBorder,
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  return (
    <Bar
      data={data}
      options={
        horizontal
          ? theme.horizontalBarChartOptions({ plugins: { legend: { display: false } } })
          : theme.barChartOptions()
      }
    />
  );
}

export function DirectorDoughnutChart({ points }: { points: ChartPoint[] }) {
  const theme = useChartTheme();
  if (points.length === 0) return <DirectorChartEmpty />;

  return (
    <Doughnut
      data={{
        labels: points.map((p) => p.label),
        datasets: [{ data: points.map((p) => p.value), ...theme.doughnutDatasetColors(points.length) }],
      }}
      options={theme.doughnutChartOptions()}
    />
  );
}

type LineSeries = { label: string; points: ChartPoint[]; colorIndex?: number };

export function DirectorLineChart({ series }: { series: LineSeries[] }) {
  const theme = useChartTheme();
  const primary = useMemo(() => getChartPrimaryColor(), [theme.theme]);

  const nonEmpty = series.filter((s) => s.points.length > 0);
  if (nonEmpty.length === 0) return <DirectorChartEmpty />;

  const labels = [...new Set(nonEmpty.flatMap((s) => s.points.map((p) => p.label)))].sort();

  const datasets = nonEmpty.map((s, i) => {
    const color = chartColorAt(s.colorIndex ?? i);
    const byLabel = new Map(s.points.map((p) => [p.label, p.value]));
    return {
      label: s.label,
      data: labels.map((l) => byLabel.get(l) ?? 0),
      borderColor: color,
      backgroundColor: withAlpha(color, 0.15),
      pointBackgroundColor: color,
      pointBorderColor: theme.colors.sliceBorder,
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
      borderWidth: 2.5,
      tension: 0.35,
      fill: true,
    };
  });

  return (
    <Line
      data={{ labels, datasets }}
      options={theme.lineChartOptions()}
    />
  );
}

export function DirectorMultiBarChart({
  labels,
  series,
}: {
  labels: string[];
  series: { label: string; data: number[]; colorIndex?: number }[];
}) {
  const theme = useChartTheme();
  if (labels.length === 0 || series.every((s) => s.data.every((v) => v === 0))) {
    return <DirectorChartEmpty />;
  }

  return (
    <Bar
      data={{
        labels,
        datasets: series.map((s, i) => ({
          label: s.label,
          data: s.data,
          backgroundColor: chartColorAt(s.colorIndex ?? i),
          borderColor: theme.colors.sliceBorder,
          borderWidth: 1,
          borderRadius: 6,
        })),
      }}
      options={theme.barChartOptions({ plugins: { legend: { display: true, position: "bottom" } } })}
    />
  );
}

/** Single-series area line using brand primary. */
export function DirectorTrendChart({ points, label }: { points: ChartPoint[]; label: string }) {
  return <DirectorLineChart series={[{ label, points, colorIndex: 0 }]} />;
}

export function DirectorRankChart({ points, label = "AMD" }: { points: ChartPoint[]; label?: string }) {
  return <DirectorVerticalBarChart points={points} label={label} horizontal />;
}
