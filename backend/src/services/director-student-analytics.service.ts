import { Op } from 'sequelize';
import { Branch, OAuthAccount, StudentProfile, User } from '../models';
import {
  realStudentUserWhere,
  studentHasPortalAccess,
} from '../helpers/student-real-account.helper';

type DateRange = { startDate: string; endDate: string; branchId?: number | null };

export type DirectorStudentAnalyticsDto = {
  totalRealStudents: number;
  registeredStudents: number;
  newInPeriod: number;
  monthlyReport: {
    labels: string[];
    newStudents: number[];
  };
  byBranch: { label: string; value: number }[];
  registrationSplit: { label: string; value: number }[];
};

function monthsBetween(startDate: string, endDate: string): string[] {
  const out: string[] = [];
  let y = Number(startDate.slice(0, 4));
  let m = Number(startDate.slice(5, 7));
  const endY = Number(endDate.slice(0, 4));
  const endM = Number(endDate.slice(5, 7));
  while (y < endY || (y === endY && m <= endM)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

function monthLabelAm(key: string): string {
  const labels = ['Հնվ', 'Փտվ', 'Մար', 'Ապր', 'Մայ', 'Հուն', 'Հուլ', 'Օգս', 'Սեպ', 'Հոկ', 'Նոյ', 'Դեկ'];
  const mo = Number(key.slice(5, 7));
  return `${labels[mo - 1] ?? key.slice(5, 7)} ${key.slice(2, 4)}`;
}

type ProfileRow = StudentProfile & {
  studentAccount: Pick<User, 'id' | 'passwordHash'>;
  Branch?: Branch | null;
};

export default class DirectorStudentAnalyticsService {
  static async analytics(range: DateRange): Promise<DirectorStudentAnalyticsDto> {
    const profileWhere =
      range.branchId != null ? { branchId: range.branchId } : {};

    const profiles = (await StudentProfile.findAll({
      where: profileWhere,
      include: [
        {
          model: User,
          as: 'studentAccount',
          where: realStudentUserWhere(),
          required: true,
          attributes: ['id', 'passwordHash'],
        },
        { model: Branch, attributes: ['id', 'name'], required: false },
      ],
    })) as ProfileRow[];

    const userIds = profiles.map((p) => p.userId);
    const oauthRows =
      userIds.length > 0
        ? await OAuthAccount.findAll({
            where: { userId: { [Op.in]: userIds } },
            attributes: ['userId'],
          })
        : [];
    const oauthUserIds = new Set(oauthRows.map((r) => r.userId));

    let registeredStudents = 0;
    const branchCounts = new Map<number, { name: string; count: number }>();
    let newInPeriod = 0;
    const newByMonth = new Map<string, number>();
    const months = monthsBetween(range.startDate, range.endDate);
    for (const m of months) newByMonth.set(m, 0);

    for (const p of profiles) {
      const stu = p.studentAccount;
      if (studentHasPortalAccess(stu, oauthUserIds, p.userId)) registeredStudents += 1;

      const bid = p.branchId;
      const branchName = p.Branch?.name?.trim() || `Մասնաճյուղ #${bid}`;
      const prev = branchCounts.get(bid);
      if (prev) prev.count += 1;
      else branchCounts.set(bid, { name: branchName, count: 1 });

      const joined =
        typeof p.joinedAt === 'string' ? p.joinedAt.slice(0, 10) : String(p.joinedAt).slice(0, 10);
      if (joined >= range.startDate && joined <= range.endDate) {
        newInPeriod += 1;
        const monthKey = joined.slice(0, 7);
        if (newByMonth.has(monthKey)) {
          newByMonth.set(monthKey, (newByMonth.get(monthKey) ?? 0) + 1);
        }
      }
    }

    const totalRealStudents = profiles.length;
    const officeRealEmailOnly = Math.max(0, totalRealStudents - registeredStudents);

    const byBranch = [...branchCounts.values()]
      .map(({ name, count }) => ({ label: name, value: count }))
      .sort((a, b) => b.value - a.value);

    const registrationSplit: DirectorStudentAnalyticsDto['registrationSplit'] = [];
    if (registeredStudents > 0) {
      registrationSplit.push({ label: 'Գրանցված հաշիվ', value: registeredStudents });
    }
    if (officeRealEmailOnly > 0) {
      registrationSplit.push({ label: 'Անհրաժեշտ գրանցում', value: officeRealEmailOnly });
    }

    return {
      totalRealStudents,
      registeredStudents,
      newInPeriod,
      monthlyReport: {
        labels: months.map(monthLabelAm),
        newStudents: months.map((m) => newByMonth.get(m) ?? 0),
      },
      byBranch,
      registrationSplit,
    };
  }
}
