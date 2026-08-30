import { useMemo } from "react";
import type { ChartOptions, TooltipItem } from "chart.js";
import { useTheme } from "src/lib/theme";
import { formatAmd } from "src/utils/currency.utils";

/** Brand-safe palette — no black or near-black. */
const FALLBACK_PALETTE = [
  "#f48633",
  "#2563eb",
  "#059669",
  "#7c3aed",
  "#d97706",
  "#db2777",
  "#0891b2",
] as const;

const CSS_COLOR_VARS = [
  "--primary",
  "--chart-1",
  "--chart-2",
  "--chart-4",
  "--chart-5",
  "--chart-3",
] as const;

export type ChartThemeColors = {
  text: string;
  grid: string;
  tooltipBg: string;
  tooltipText: string;
  tooltipBorder: string;
  sliceBorder: string;
};

function isNearBlack(color: string): boolean {
  const m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(color);
  if (!m) return false;
  const r = Number(m[1]);
  const g = Number(m[2]);
  const b = Number(m[3]);
  return r < 48 && g < 48 && b < 48;
}

/** Resolve a CSS custom property to an rgb/rgba string Chart.js can paint. */
export function resolveCssColor(varName: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;

  const el = document.createElement("div");
  el.style.display = "none";
  el.style.backgroundColor = `var(${varName})`;
  document.documentElement.appendChild(el);
  const resolved = getComputedStyle(el).backgroundColor;
  document.documentElement.removeChild(el);

  if (!resolved || resolved === "rgba(0, 0, 0, 0)" || resolved === "transparent") {
    return fallback;
  }
  if (isNearBlack(resolved)) return fallback;
  return resolved;
}

export function getChartThemeColors(): ChartThemeColors {
  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");

  return {
    text: resolveCssColor("--muted-foreground", isDark ? "#a1a1a1" : "#565555"),
    grid: resolveCssColor("--border", isDark ? "#3f3a38" : "#e2ded5"),
    tooltipBg: resolveCssColor("--popover", isDark ? "#161312" : "#ffffff"),
    tooltipText: resolveCssColor("--popover-foreground", isDark ? "#f9f8f5" : "#0d0b0b"),
    tooltipBorder: resolveCssColor("--border", isDark ? "#565555" : "#e2ded5"),
    sliceBorder: resolveCssColor("--card", isDark ? "#161312" : "#ffffff"),
  };
}

export function getChartPalette(): string[] {
  return CSS_COLOR_VARS.map((name, i) =>
    resolveCssColor(name, FALLBACK_PALETTE[i % FALLBACK_PALETTE.length]!),
  );
}

export function chartColorAt(index: number): string {
  const palette = getChartPalette();
  return palette[index % palette.length]!;
}

export function getChartPrimaryColor(): string {
  return resolveCssColor("--primary", FALLBACK_PALETTE[0]);
}

function tooltipValue(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return formatAmd(Math.round(value));
}

function chartNumericValue(context: TooltipItem<"bar" | "doughnut" | "line">): number | null {
  if (context.chart.config.type === "doughnut") {
    return typeof context.parsed === "number" ? context.parsed : null;
  }
  const parsed = context.parsed as { x?: number; y?: number };
  const horizontal = context.chart.options.indexAxis === "y";
  const raw = horizontal ? parsed.x : parsed.y;
  return typeof raw === "number" ? raw : null;
}

function buildTooltipOptions(colors: ChartThemeColors) {
  return {
    enabled: true,
    backgroundColor: colors.tooltipBg,
    titleColor: colors.tooltipText,
    bodyColor: colors.tooltipText,
    footerColor: colors.text,
    borderColor: colors.tooltipBorder,
    borderWidth: 1,
    padding: 12,
    cornerRadius: 8,
    displayColors: true,
    boxPadding: 6,
    usePointStyle: true,
    titleFont: {
      size: 13,
      weight: "600" as const,
      family: "Inter, system-ui, sans-serif",
    },
    bodyFont: {
      size: 12,
      family: "Inter, system-ui, sans-serif",
    },
    footerFont: {
      size: 11,
      family: "Inter, system-ui, sans-serif",
    },
    callbacks: {
      label(context: TooltipItem<"bar" | "doughnut" | "line">) {
        const formatted = tooltipValue(chartNumericValue(context));
        if (context.chart.config.type === "doughnut") return formatted;
        const label = context.dataset.label
          ? `${context.dataset.label}: `
          : context.label
            ? `${context.label}: `
            : "";
        return `${label}${formatted}`;
      },
    },
  };
}

function baseScaleColors(colors: ChartThemeColors) {
  return {
    ticks: {
      color: colors.text,
      font: { size: 11 },
    },
    grid: { color: colors.grid, drawTicks: false },
    border: { display: false },
  };
}

function compactAxis(value: string | number): string {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "";
  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

type ScaleChartOptions = ChartOptions<"bar" | "line">;

export function barChartOptions(overrides?: Partial<ScaleChartOptions>): ScaleChartOptions {
  const colors = getChartThemeColors();
  const scale = baseScaleColors(colors);

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
        labels: { color: colors.text, boxWidth: 12, boxHeight: 12, usePointStyle: true },
      },
      tooltip: buildTooltipOptions(colors),
    },
    scales: {
      x: {
        ...scale,
        ticks: { ...scale.ticks, callback: compactAxis },
      },
      y: {
        ...scale,
        ticks: { ...scale.ticks, callback: compactAxis },
      },
    },
    ...overrides,
  };
}

export function horizontalBarChartOptions(overrides?: Partial<ScaleChartOptions>): ScaleChartOptions {
  return barChartOptions({
    indexAxis: "y",
    ...overrides,
  });
}

type LineChartOptions = ChartOptions<"line">;

export function lineChartOptions(overrides?: Partial<LineChartOptions>): LineChartOptions {
  const colors = getChartThemeColors();
  const scale = baseScaleColors(colors);

  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        display: true,
        position: "bottom",
        labels: {
          color: colors.text,
          boxWidth: 10,
          boxHeight: 10,
          usePointStyle: true,
          padding: 16,
          font: { size: 11 },
        },
      },
      tooltip: buildTooltipOptions(colors),
    },
    scales: {
      x: scale,
      y: {
        ...scale,
        ticks: { ...scale.ticks, callback: compactAxis },
      },
    },
    ...overrides,
  };
}

type DoughnutChartOptions = ChartOptions<"doughnut">;

export function doughnutChartOptions(overrides?: Partial<DoughnutChartOptions>): DoughnutChartOptions {
  const colors = getChartThemeColors();

  return {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "62%",
    plugins: {
      legend: {
        display: true,
        position: "bottom",
        labels: {
          color: colors.text,
          boxWidth: 12,
          boxHeight: 12,
          usePointStyle: true,
          padding: 16,
          font: { size: 11 },
        },
      },
      tooltip: buildTooltipOptions(colors),
    },
    ...overrides,
  };
}

/** One bar per category with distinct palette colors. */
export function barDatasetColors(count: number): string[] {
  return Array.from({ length: count }, (_, i) => chartColorAt(i));
}

export function doughnutDatasetColors(count: number, borderColor: string): {
  backgroundColor: string[];
  borderColor: string;
  borderWidth: number;
  hoverBorderWidth: number;
} {
  return {
    backgroundColor: Array.from({ length: count }, (_, i) => chartColorAt(i)),
    borderColor,
    borderWidth: 2,
    hoverBorderWidth: 2,
  };
}

/** Re-reads theme tokens when light/dark mode toggles. */
export function useChartTheme() {
  const { theme } = useTheme();

  return useMemo(
    () => {
      const colors = getChartThemeColors();
      return {
        theme,
        colors,
        barChartOptions: (overrides?: Partial<ScaleChartOptions>) => barChartOptions(overrides),
        horizontalBarChartOptions: (overrides?: Partial<ScaleChartOptions>) =>
          horizontalBarChartOptions(overrides),
        lineChartOptions: (overrides?: Partial<LineChartOptions>) => lineChartOptions(overrides),
        doughnutChartOptions: (overrides?: Partial<DoughnutChartOptions>) =>
          doughnutChartOptions(overrides),
        barDatasetColors: (count: number) => barDatasetColors(count),
        doughnutDatasetColors: (count: number) => doughnutDatasetColors(count, colors.sliceBorder),
      };
    },
    [theme],
  );
}
