import { useCallback, useEffect, useState } from "react";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";

export type ProgressLessonSnapshot = {
  lessonType: "practical" | "theory_personal" | "theory_group";
  dateIso: string;
  time: string;
  endTime: string | null;
  label: string;
};

export type LessonTypeProgress = {
  total: number;
  completed: number;
  remaining: number;
  progressPercent: number;
  upcoming: number;
};

export type StudentProgressDto = {
  studentUserId: number;
  lastCalculatedAt: string;
  overall: {
    totalLessons: number;
    completedLessons: number;
    remainingLessons: number;
    progressPercent: number;
    upcomingLessons: number;
  };
  practical: LessonTypeProgress;
  personalTheory: LessonTypeProgress;
  groupTheory: LessonTypeProgress;
  lastCompletedLesson: ProgressLessonSnapshot | null;
  nextUpcomingLesson: ProgressLessonSnapshot | null;
};

export function useStudentProgress(opts: {
  studentUserId?: number;
  /** When true, uses GET /student/progress (logged-in student). */
  self?: boolean;
}) {
  const [progress, setProgress] = useState<StudentProgressDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (opts.self) {
      setLoading(true);
      setError(null);
      try {
        const data = await vivaApiJson<StudentProgressDto>("/student/progress");
        setProgress(data);
      } catch (e) {
        setError(getApiErrorMessage(e));
        setProgress(null);
      } finally {
        setLoading(false);
      }
      return;
    }
    if (!opts.studentUserId) {
      setProgress(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await vivaApiJson<StudentProgressDto>(
        `/students/${encodeURIComponent(String(opts.studentUserId))}/progress`,
      );
      setProgress(data);
    } catch (e) {
      setError(getApiErrorMessage(e));
      setProgress(null);
    } finally {
      setLoading(false);
    }
  }, [opts.self, opts.studentUserId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { progress, loading, error, refresh };
}
