import AdminSalaryService, {
  INSTRUCTOR_LESSON_RATE_AMD,
  THEORY_TEACHER_LESSON_RATE_AMD,
  type SalaryLessonRowDto,
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

/** Self-scoped slice of the super-admin salary report for one instructor. */
export default class InstructorSalaryReportService {
  static async report(
    employeeUserId: number,
    startDate?: string,
    endDate?: string,
  ): Promise<InstructorSalaryReportDto> {
    const [practical, theory] = await Promise.all([
      AdminSalaryService.lessons('instructor', employeeUserId, startDate, endDate),
      AdminSalaryService.lessons('theory_teacher', employeeUserId, startDate, endDate),
    ]);

    const practicalSection: InstructorSalaryReportSectionDto = {
      lessonsCount: practical.totalUnits,
      ratePerLessonAmd: INSTRUCTOR_LESSON_RATE_AMD,
      totalAmd: practical.totalUnits * INSTRUCTOR_LESSON_RATE_AMD,
      items: practical.items,
    };
    const theorySection: InstructorSalaryReportSectionDto = {
      lessonsCount: theory.totalUnits,
      ratePerLessonAmd: THEORY_TEACHER_LESSON_RATE_AMD,
      totalAmd: theory.totalUnits * THEORY_TEACHER_LESSON_RATE_AMD,
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
}
