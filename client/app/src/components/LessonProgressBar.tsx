type LessonProgressBarProps = {
  label: string;
  completed: number;
  total: number;
  percent: number;
  remainingLabel?: string;
  upcomingLabel?: string;
  className?: string;
};

export default function LessonProgressBar({
  label,
  completed,
  total,
  percent,
  remainingLabel,
  upcomingLabel,
  className = "",
}: LessonProgressBarProps) {
  const safePercent = Math.min(100, Math.max(0, percent));
  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2 text-sm mb-1.5">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground tabular-nums text-xs">
          {completed} / {total}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-accent overflow-hidden">
        <div
          className="h-2 rounded-full bg-primary transition-all duration-500"
          style={{ width: `${safePercent}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground mt-1 gap-2">
        <span className="tabular-nums">{safePercent}%</span>
        <span className="text-right truncate">
          {remainingLabel}
          {remainingLabel && upcomingLabel ? " · " : null}
          {upcomingLabel}
        </span>
      </div>
    </div>
  );
}
