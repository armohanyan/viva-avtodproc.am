"use client";

import { useMemo } from "react";
import { cn } from "src/lib/utils";
import { useLang, type TranslationKey } from "src/lib/i18n";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "src/components/ui/select";
import { normalizeTimeHHMM } from "src/modules/booking/booking-slot.util";

const MINUTES = Array.from({ length: 60 }, (_, m) => String(m).padStart(2, "0"));

type HourGroup = {
  labelKey: TranslationKey;
  hours: string[];
};

const HOUR_GROUPS: HourGroup[] = [
  { labelKey: "timePeriodNight", hours: ["00", "01", "02", "03", "04"] },
  { labelKey: "timePeriodMorning", hours: ["05", "06", "07", "08", "09", "10", "11"] },
  { labelKey: "timePeriodAfternoon", hours: ["12", "13", "14", "15", "16"] },
  { labelKey: "timePeriodEvening", hours: ["17", "18", "19", "20", "21", "22", "23"] },
];

function periodKeyForHour(hour24: number): TranslationKey {
  if (hour24 < 5) return "timePeriodNight";
  if (hour24 < 12) return "timePeriodMorning";
  if (hour24 < 17) return "timePeriodAfternoon";
  return "timePeriodEvening";
}

export type TimeSelectInputProps = {
  value: string;
  onChange: (nextHHMM: string) => void;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
};

/** 24-hour hour + minute selects with morning/afternoon grouping. */
export function TimeSelectInput({
  value,
  onChange,
  className,
  triggerClassName,
  disabled,
  id,
  "aria-label": ariaLabel,
}: TimeSelectInputProps) {
  const { t } = useLang();
  const normalized = useMemo(() => normalizeTimeHHMM(value ?? "") ?? "", [value]);
  const hour = normalized.slice(0, 2) || "";
  const minute = normalized.slice(3, 5) || "";
  const hourNum = hour ? Number(hour) : NaN;

  const emit = (nextHour: string, nextMinute: string) => {
    if (!/^\d{2}$/.test(nextHour) || !/^\d{2}$/.test(nextMinute)) return;
    onChange(`${nextHour}:${nextMinute}`);
  };

  return (
    <div
      className={cn("flex min-w-0 flex-col gap-1", className)}
      id={id}
      aria-label={ariaLabel}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <Select
          value={hour || undefined}
          disabled={disabled}
          onValueChange={(h) => emit(h, minute || "00")}
        >
          <SelectTrigger
            className={cn("h-10 min-w-0 flex-1 tabular-nums", triggerClassName)}
            aria-label={t("timeSelectHour")}
          >
            <SelectValue placeholder={t("timeSelectHour")} />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-72">
            {HOUR_GROUPS.map((group) => (
              <SelectGroup key={group.labelKey}>
                <SelectLabel>{t(group.labelKey)}</SelectLabel>
                {group.hours.map((h) => (
                  <SelectItem key={h} value={h} className="tabular-nums">
                    {h}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
        <span className="shrink-0 text-sm font-semibold text-muted-foreground" aria-hidden>
          :
        </span>
        <Select
          value={minute || undefined}
          disabled={disabled}
          onValueChange={(m) => emit(hour || "00", m)}
        >
          <SelectTrigger
            className={cn("h-10 w-[4.75rem] shrink-0 tabular-nums", triggerClassName)}
            aria-label={t("timeSelectMinute")}
          >
            <SelectValue placeholder={t("timeSelectMinute")} />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-72">
            {MINUTES.map((m) => (
              <SelectItem key={m} value={m} className="tabular-nums">
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {Number.isFinite(hourNum) ? (
        <p className="text-[11px] leading-snug text-muted-foreground tabular-nums">
          {normalized} · {t(periodKeyForHour(hourNum))}
        </p>
      ) : null}
    </div>
  );
}
