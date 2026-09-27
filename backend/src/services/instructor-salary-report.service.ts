import { InstructorProfile } from '../models';
import { yerevanTodayIso } from '../utils/booking-slot.util';
import AdminSalaryService, {
  INSTRUCTOR_LESSON_RATE_AMD,
  THEORY_TEACHER_LESSON_RATE_AMD,
  type SalaryEmployeeReportRowDto,
  type SalaryLessonRowDto,
  type SalaryPaymentDto,
} from './admin-salary.service';

export type InstructorSalaryReportSectionDto = {
  lessonsCount: number;
  ratePerLessonAmd: number;
  totalAmd: number;
  items: SalaryLessonRowDto[];
};

export type InstructorSalaryReportDto = {
  startDate: string;
  endDate: string;
  practical: InstructorSalaryReportSectionDto;
  theory: InstructorSalaryReportSectionDto;
  totalAmd: number;
};

export type InstructorSalaryOverviewDto = {
  current: SalaryEmployeeReportRowDto & {
    startDate: string;
    endDate: string;
  };
  history: SalaryPaymentDto[];
};

/** Half-month pay period (1–15 or 16–end) containing today in Yerevan. */
function currentHalfMonthPeriod(now = new Date()): { start: string; end: string } {
  const iso = yerevanTodayIso(now);
  const [y, m, d] = iso.split('-').map(Number);
  const prefix = iso.slice(0, 8);
  if (d <= 15) return { start: `${prefix}01`, end: `${prefix}15` };
  const lastDay = String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0');
  return { start: `${prefix}16`, end: `${iso.slice(0, 7)}-${lastDay}` };
}

/** Self-scoped slice of the super-admin salary report for one instructor. */
export default class InstructorSalaryReportService {
  static async report(
    employeeUserId: number,
    startDate?: string,
    endDate?: string,
  ): Promise<InstructorSalaryReportDto> {
    const [practical, theory, profile] = await Promise.all([
      AdminSalaryService.lessons('instructor', employeeUserId, startDate, endDate),
      AdminSalaryService.lessons('theory_teacher', employeeUserId, startDate, endDate),
      InstructorProfile.findOne({
        where: { userId: employeeUserId },
        attributes: ['practicalSalaryPerLessonAmd', 'theorySalaryPerLessonAmd'],
      }),
    ]);

    const practicalRate =
      profile?.practicalSalaryPerLessonAmd ?? INSTRUCTOR_LESSON_RATE_AMD;
    const theoryRate = profile?.theorySalaryPerLessonAmd ?? THEORY_TEACHER_LESSON_RATE_AMD;

    const practicalSection: InstructorSalaryReportSectionDto = {
      lessonsCount: practical.totalUnits,
      ratePerLessonAmd: practicalRate,
      totalAmd: practical.totalUnits * practicalRate,
      items: practical.items,
    };
    const theorySection: InstructorSalaryReportSectionDto = {
      lessonsCount: theory.totalUnits,
      ratePerLessonAmd: theoryRate,
      totalAmd: theory.totalUnits * theoryRate,
      items: theory.items,
    };

    return {
      startDate: practical.startDate,
      endDate: practical.endDate,
      practical: practicalSection,
      theory: theorySection,
      totalAmd: practicalSection.totalAmd + theorySection.totalAmd,
    };
  }

  /** Current half-month expectation plus this instructor's payout history. */
  static async overview(employeeUserId: number): Promise<InstructorSalaryOverviewDto> {
    const period = currentHalfMonthPeriod();
    const [current, history] = await Promise.all([
      AdminSalaryService.employeeDetail(employeeUserId, period.start, period.end),
      AdminSalaryService.listEmployeePayments(employeeUserId),
    ]);
    return {
      current: {
        ...current,
        startDate: period.start,
        endDate: period.end,
      },
      history: history.items,
    };
  }
}
