"use client";

import { useLang } from "src/lib/i18n";
import { cn } from "src/lib/utils";
import type { InstructorCityGroup } from "src/modules/instructors/instructorLocationFilter";

type Props = {
  groups: readonly InstructorCityGroup[];
  cityKey: string;
  regionId: string;
  onCityChange: (cityKey: string) => void;
  onRegionChange: (regionId: string) => void;
};

function Pill({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors touch-manipulation",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}

export default function InstructorLocationFilter({
  groups,
  cityKey,
  regionId,
  onCityChange,
  onRegionChange,
}: Props) {
  const { t } = useLang();
  if (groups.length === 0) return null;

  const selected = groups.find((group) => group.key === cityKey);
  const regions = selected && selected.regions.length > 1 ? selected.regions : [];

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-3">
      <div className="flex flex-wrap items-center justify-center gap-2" role="group" aria-label={t("branchCityLabel")}>
        <Pill active={cityKey === ""} onClick={() => onCityChange("")}>
          {t("instructorFilterAllCities")}
        </Pill>
        {groups.map((group) => (
          <Pill key={group.key} active={cityKey === group.key} onClick={() => onCityChange(group.key)}>
            {group.name}
          </Pill>
        ))}
      </div>

      {regions.length > 0 ? (
        <div
          className="flex w-full flex-wrap items-center justify-center gap-2 rounded-2xl border border-border/70 bg-accent/50 px-3 py-2.5"
          role="group"
          aria-label={t("instructorFilterRegion")}
        >
          <span className="px-1 text-xs font-semibold text-muted-foreground">{t("instructorFilterRegion")}</span>
          <Pill active={regionId === ""} onClick={() => onRegionChange("")}>
            {t("instructorFilterAllRegions")}
          </Pill>
          {regions.map((region) => (
            <Pill key={region.id} active={regionId === region.id} onClick={() => onRegionChange(region.id)}>
              {region.name}
            </Pill>
          ))}
        </div>
      ) : null}
    </div>
  );
}
