import { useEffect, useMemo, useRef, useState } from "react";
import type { Instructor } from "src/data/instructors";
import type { TranslationKey } from "src/lib/i18n";
import { vivaApiJson } from "src/lib/vivaApi";
import { Input } from "src/components/ui/input";
import { TimeSelectInput } from "src/components/ui/time-select-input";
import { formatAmd } from "src/utils/currency.utils";
import {
  normalizeAvailabilityBlocksFromApi,
  type AvailabilityBlock,
} from "src/modules/instructors/instructorAvailability";
import {
  assessPersonalTheoryWindow,
  formatOccupiedRangeLabel,
  type OccupiedRange,
  type PersonalTheoryWindowAssessment,
} from "./personalTheorySchedule";

export type PersonalTheoryScheduleStatus = {
  checking: boolean;
  checkFailed: boolean;
  valid: boolean;
  unavailable: boolean;
  overlapLabel: string | null;
  near: { label: string; gapMinutes: number }[];
  acknowledged: boolean;
};

type Props = {
  instructors: readonly Instructor[];
  instructorId: string;
  onInstructorId: (id: string) => void;
  dateIso: string;
  onDateIso: (dateIso: string) => void;
  startTime: string;
  onStartTime: (time: string) => void;
  endTime: string;
  onEndTime: (time: string) => void;
  excludeBookingId?: string;
  onStatus: (status: PersonalTheoryScheduleStatus) => void;
  t: (k: TranslationKey) => string;
};

const selectClass =
  "w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

function fill(template: string, values: Record<string, string>): string {
  let text = template;
  for (const [key, value] of Object.entries(values)) {
    text = text.split(`%${key}%`).join(value);
  }
  return text;
}

export default function PersonalTheoryScheduleFields({
  instructors,
  instructorId,
  onInstructorId,
  dateIso,
  onDateIso,
  startTime,
  onStartTime,
  endTime,
  onEndTime,
  excludeBookingId = "",
  onStatus,
  t,
}: Props) {
  const [ranges, setRanges] = useState<OccupiedRange[]>([]);
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [checking, setChecking] = useState(false);
  const [checkFailed, setCheckFailed] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;

  const windowKey = `${instructorId}|${dateIso}|${startTime}|${endTime}|${excludeBookingId}`;
  useEffect(() => {
    setAcknowledged(false);
  }, [windowKey]);

  useEffect(() => {
    const id = instructorId.trim();
    const day = dateIso.slice(0, 10);
    if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      setRanges([]);
      setBlocks([]);
      setChecking(false);
      setCheckFailed(false);
      return;
    }
    let cancelled = false;
    setChecking(true);
    setCheckFailed(false);
    setRanges([]);
    setBlocks([]);
    const q = new URLSearchParams({ from: day, to: day, shape: "ranges" });
    const exclude = excludeBookingId.trim();
    if (exclude) q.set("excludeBookingId", exclude);
    void (async () => {
      try {
        const [rangeRows, blockRows] = await Promise.all([
          vivaApiJson<OccupiedRange[]>(`/instructors/${encodeURIComponent(id)}/busy-slots?${q.toString()}`),
          vivaApiJson<unknown>(`/instructors/${encodeURIComponent(id)}/availability-blocks`),
        ]);
        if (cancelled) return;
        setRanges(Array.isArray(rangeRows) ? rangeRows : []);
        setBlocks(normalizeAvailabilityBlocksFromApi(blockRows));
        setCheckFailed(false);
      } catch {
        if (cancelled) return;
        setRanges([]);
        setBlocks([]);
        setCheckFailed(true);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [instructorId, dateIso, excludeBookingId]);

  const assessment: PersonalTheoryWindowAssessment = useMemo(
    () =>
      assessPersonalTheoryWindow({
        dateIso,
        start: startTime,
        end: endTime,
        ranges,
        blocks,
      }),
    [dateIso, startTime, endTime, ranges, blocks],
  );

  const selected = instructors.find((i) => i.id === instructorId) ?? null;
  const hourly = selected && Number.isFinite(selected.hourlyPrice) ? selected.hourlyPrice : 0;
  const priceAmd = assessment.billableHours > 0 ? Math.round(hourly * assessment.billableHours) : 0;

  const status = useMemo<PersonalTheoryScheduleStatus>(
    () => ({
      checking,
      checkFailed,
      valid: assessment.valid,
      unavailable: assessment.unavailable,
      overlapLabel: assessment.overlap ? formatOccupiedRangeLabel(assessment.overlap) : null,
      near: assessment.near.map((row) => ({
        label: formatOccupiedRangeLabel(row),
        gapMinutes: row.gapMinutes,
      })),
      acknowledged: assessment.near.length === 0 || acknowledged,
    }),
    [checking, checkFailed, assessment, acknowledged],
  );

  useEffect(() => {
    onStatusRef.current(status);
  }, [status]);

  return (
    <div className="space-y-3 pt-2 border-t border-border">
      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-1">{t("adminBookingPersonalTheoryTeacher")}</label>
        {instructors.length === 0 ? (
          <p className="text-xs text-amber-700 dark:text-amber-400">{t("adminBookingPersonalTheoryNoTeachers")}</p>
        ) : (
          <select
            value={instructorId}
            onChange={(e) => onInstructorId(e.target.value)}
            className={selectClass}
          >
            <option value="">{t("adminBookingValSelectInstructor")}</option>
            {instructors.map((ins) => (
              <option key={ins.id} value={ins.id}>
                {ins.teachesPractical && ins.teachesTheory
                  ? `${ins.name} · ${t("instructorTeachingPractical")} + ${t("instructorTeachingTheory")}`
                  : ins.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-1">{t("date")}</label>
        <Input
          type="date"
          value={dateIso.slice(0, 10)}
          onChange={(e) => onDateIso(e.target.value)}
          className="h-10"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">{t("adminBookingPersonalTheoryStart")}</label>
          <TimeSelectInput
            value={startTime}
            onChange={onStartTime}
            aria-label={t("adminBookingPersonalTheoryStart")}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">{t("adminBookingPersonalTheoryEnd")}</label>
          <TimeSelectInput
            value={endTime}
            onChange={onEndTime}
            aria-label={t("adminBookingPersonalTheoryEnd")}
          />
        </div>
      </div>

      {assessment.valid && priceAmd > 0 ? (
        <p className="text-sm text-foreground tabular-nums">
          {fill(t("adminBookingPersonalTheoryPrice"), {
            min: String(assessment.durationMinutes),
            hours: String(assessment.billableHours),
            total: formatAmd(priceAmd),
          })}
        </p>
      ) : null}

      {checking ? <p className="text-xs text-muted-foreground">{t("adminBookingPersonalTheoryChecking")}</p> : null}
      {checkFailed ? <p className="text-xs text-amber-700 dark:text-amber-400">{t("adminBookingPersonalTheoryCheckFailed")}</p> : null}
      {!checking && assessment.unavailable ? (
        <p className="text-xs text-red-600">{t("adminBookingPersonalTheoryUnavailable")}</p>
      ) : null}
      {!checking && !assessment.unavailable && status.overlapLabel ? (
        <p className="text-xs text-red-600">
          {fill(t("adminBookingPersonalTheoryOverlap"), { range: status.overlapLabel })}
        </p>
      ) : null}
      {!checking && !assessment.unavailable && !status.overlapLabel && assessment.valid && status.near.length === 0 && !checkFailed ? (
        <p className="text-xs text-emerald-700 dark:text-emerald-400">{t("adminBookingPersonalTheoryAvailable")}</p>
      ) : null}
      {!checking && !assessment.unavailable && !status.overlapLabel
        ? status.near.map((row) => (
            <p key={`${row.label}-${row.gapMinutes}`} className="text-xs text-amber-800 dark:text-amber-300">
              {fill(t("adminBookingPersonalTheoryNear"), { range: row.label, gap: String(row.gapMinutes) })}
            </p>
          ))
        : null}
      {!checking && !assessment.unavailable && !status.overlapLabel && status.near.length > 0 ? (
        <label className="flex items-start gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-input accent-primary"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
          />
          <span>{t("adminBookingPersonalTheoryNearAck")}</span>
        </label>
      ) : null}
    </div>
  );
}
