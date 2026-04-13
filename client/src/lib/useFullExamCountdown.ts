import { useEffect, useRef, useState } from "react";

/** Duration for full mock exam (theory), aligned with typical official time limits. */
export const FULL_EXAM_DURATION_MS = 30 * 60 * 1000;

type UseFullExamCountdownOptions = {
  /** When false, timer is cleared and not shown. */
  active: boolean;
  /** Increment (e.g. quiz round) to restart the countdown from full duration. */
  resetKey: number;
  onExpire: () => void;
};

export function useFullExamCountdown({ active, resetKey, onExpire }: UseFullExamCountdownOptions) {
  const [remainingMs, setRemainingMs] = useState(active ? FULL_EXAM_DURATION_MS : 0);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (!active) {
      setRemainingMs(0);
      return;
    }

    setRemainingMs(FULL_EXAM_DURATION_MS);
    const deadline = Date.now() + FULL_EXAM_DURATION_MS;
    const id = window.setInterval(() => {
      const next = Math.max(0, deadline - Date.now());
      setRemainingMs(next);
      if (next <= 0) {
        window.clearInterval(id);
        onExpireRef.current();
      }
    }, 250);

    return () => window.clearInterval(id);
  }, [active, resetKey]);

  const totalSec = Math.ceil(remainingMs / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const formatted = `${m}:${s.toString().padStart(2, "0")}`;
  const isCritical = remainingMs > 0 && remainingMs <= 60_000;
  const isWarning = remainingMs > 60_000 && remainingMs <= 5 * 60_000;

  return { remainingMs, formatted, isCritical, isWarning };
}
