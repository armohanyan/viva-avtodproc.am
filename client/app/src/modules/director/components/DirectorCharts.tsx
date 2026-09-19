import { ReactNode, useMemo } from "react";
import { BarChart3 } from "lucide-react";
import { cn } from "src/lib/utils";
import {
  useChartTheme,
  chartColorAt,
  getChartPrimaryColor,
  formatChartValue,
  type ChartValueFormat,
} from "src/lib/chartTheme";
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
    <DirectorCard className={cn("flex flex-col", className)}>
      <div className="mb-3 shrink-0">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle ? <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p> : null}
      </div>
      <div
        className={cn(
          "relative w-full rounded-lg bg-muted/30 border border-border/60 p-3",
          tall ? "h-80" : "h-64",
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

function DoughnutLegend({
  points,
  colors,
  valueFormat,
}: {
  points: ChartPoint[];
  colors: string[];
  valueFormat: ChartValueFormat;
}) {
  const total = points.reduce((sum, p) => sum + p.value, 0);
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 shrink-0 pt-1 border-t border-border/50">
      {points.map((p, i) => {
        const pct = total > 0 ? Math.round((p.value / total) * 100) : 0;
        return (
          <li key={`${p.label}-${i}`} className="flex items-center gap-1.5 text-xs leading-tight">
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: colors[i % colors.length] }}
              aria-hidden
            />
            <span className="text-foreground font-medium">{p.label}</span>
            <span className="text-muted-foreground">
              {formatChartValue(p.value, valueFormat)}
              {total > 0 ? ` (${pct}%)` : ""}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function DirectorVerticalBarChart({
  points,
  label = "AMD",
  horizontal,
  valueFormat = "currency",
}: {
  points: ChartPoint[];
  label?: string;
  horizontal?: boolean;
  valueFormat?: ChartValueFormat;
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
          ? theme.horizontalBarChartOptions(
              { plugins: { legend: { display: false } } },
              { valueFormat },
            )
          : theme.barChartOptions(undefined, { valueFormat })
      }
    />
  );
}

export function DirectorDoughnutChart({
  points,
  valueFormat = "currency",
}: {
  points: ChartPoint[];
  valueFormat?: ChartValueFormat;
}) {
  const theme = useChartTheme();
  if (points.length === 0) return <DirectorChartEmpty />;

  const sliceColors = theme.barDatasetColors(points.length);

  return (
    <div className="h-full flex flex-col gap-2">
      <div className="relative flex-1 min-h-0">
        <Doughnut
          data={{
            labels: points.map((p) => p.label),
            datasets: [
              {
                data: points.map((p) => p.value),
                ...theme.doughnutDatasetColors(points.length),
                backgroundColor: sliceColors,
              },
            ],
          }}
          options={theme.doughnutChartOptions(undefined, { valueFormat, showLegend: false })}
        />
      </div>
      <DoughnutLegend points={points} colors={sliceColors} valueFormat={valueFormat} />
    </div>
  );
}

type LineSeries = { label: string; points: ChartPoint[]; colorIndex?: number };

export function DirectorLineChart({
  series,
  valueFormat = "currency",
}: {
  series: LineSeries[];
  valueFormat?: ChartValueFormat;
}) {
  const theme = useChartTheme();
  const primary = useMemo(() => getChartPrimaryColor(), [theme.theme]);

  const nonEmpty = series.filter((s) => s.points.length > 0);
  if (nonEmpty.length === 0) return <DirectorChartEmpty />;

  const labels = [...new Set(nonEmpty.flatMap((s) => s.points.map((p) => p.label)))].sort();

  const datasets = nonEmpty.map((s, i) => {
    const color = chartColorAt(s.colorIndex ?? i) || primary;
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
      options={theme.lineChartOptions(
        {
          plugins: {
            legend: {
              display: nonEmpty.length > 1,
              position: "bottom",
            },
          },
        },
        { valueFormat },
      )}
    />
  );
}

export function DirectorMultiBarChart({
  labels,
  series,
  valueFormat = "count",
}: {
  labels: string[];
  series: { label: string; data: number[]; colorIndex?: number }[];
  valueFormat?: ChartValueFormat;
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
      options={theme.barChartOptions(
        {
          plugins: {
            legend: {
              display: series.length > 1,
              position: "bottom",
            },
          },
        },
        { valueFormat },
      )}
    />
  );
}

/** Single-series area line using brand primary. */
export function DirectorTrendChart({
  points,
  label,
  valueFormat = "currency",
}: {
  points: ChartPoint[];
  label: string;
  valueFormat?: ChartValueFormat;
}) {
  return <DirectorLineChart series={[{ label, points, colorIndex: 0 }]} valueFormat={valueFormat} />;
}

export function DirectorRankChart({
  points,
  label = "AMD",
  valueFormat = "currency",
}: {
  points: ChartPoint[];
  label?: string;
  valueFormat?: ChartValueFormat;
}) {
  return (
    <DirectorVerticalBarChart points={points} label={label} horizontal valueFormat={valueFormat} />
  );
}
