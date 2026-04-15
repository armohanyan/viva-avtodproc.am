import { QueryTypes } from 'sequelize';
import { sequelize } from '../database/sequelize';
import { Booking, InstructorProfile, InstructorStudentRating, User } from '../models';
import ErrorsUtil from '../utils/errors.util';
import { HttpStatusCodesUtil } from '../utils';

const { InputValidationError } = ErrorsUtil;

export type InstructorRatingAgg = { count: number; avg: number };

export type PendingInstructorRatingDto = {
  instructorUserId: string;
  instructorName: string;
  lastCompletedDateIso: string;
};

export type MyInstructorRatingDto = {
  instructorUserId: string;
  instructorName: string;
  stars: number;
};

export type InstructorRatingStatusDto = {
  pending: PendingInstructorRatingDto[];
  myRatings: MyInstructorRatingDto[];
};

function todayIsoUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Matches student dashboard “upcoming” partition (date + status). */
function bookingIsUpcoming(dateIso: string, status: string, todayIso: string): boolean {
  if (status === 'cancelled' || status === 'completed' || status === 'refunded') return false;
  return dateIso >= todayIso;
}

export default class InstructorStudentRatingService {
  static async aggregatesForInstructors(instructorIds: readonly string[]): Promise<Map<string, InstructorRatingAgg>> {
    const out = new Map<string, InstructorRatingAgg>();
    if (instructorIds.length === 0) return out;
    const uniq = [...new Set(instructorIds)];
    const placeholders = uniq.map(() => '?').join(',');
    const rows = await sequelize.query<{ instructorUserId: string; cnt: number; avgStars: string }>(
      `SELECT instructor_user_id AS instructorUserId, COUNT(*) AS cnt, AVG(stars) AS avgStars
       FROM instructor_student_ratings
       WHERE instructor_user_id IN (${placeholders})
       GROUP BY instructor_user_id`,
      { replacements: uniq, type: QueryTypes.SELECT },
    );
    for (const r of rows) {
      const avg = Number.parseFloat(String(r.avgStars));
      if (!Number.isFinite(avg)) continue;
      out.set(r.instructorUserId, { count: Number(r.cnt) || 0, avg });
    }
    return out;
  }

  static async countForInstructor(instructorUserId: string): Promise<number> {
    return InstructorStudentRating.count({ where: { instructorUserId } });
  }

  static async syncProfileRatingFromReviews(instructorUserId: string): Promise<void> {
    const agg = (await this.aggregatesForInstructors([instructorUserId])).get(instructorUserId);
    if (!agg || agg.count === 0) {
      await InstructorProfile.update({ rating: 5 }, { where: { userId: instructorUserId } });
      return;
    }
    const rounded = Math.min(5, Math.max(0, Math.round(agg.avg * 10) / 10));
    await InstructorProfile.update({ rating: rounded }, { where: { userId: instructorUserId } });
  }

  static async listPendingForStudent(studentUserId: string): Promise<PendingInstructorRatingDto[]> {
    const user = await User.findByPk(studentUserId);
    if (!user || user.accountType !== 'student') return [];

    const bookings = await Booking.findAll({
      where: { studentUserId },
      include: [{ model: User, as: 'instructor', required: true, attributes: ['id', 'name'] }],
    });

    const todayIso = todayIsoUtc();
    const rated = new Set(
      (
        await InstructorStudentRating.findAll({
          where: { studentUserId },
          attributes: ['instructorUserId'],
        })
      ).map((r) => r.instructorUserId),
    );

    type InstKey = string;
    const lastCompletedByInstructor = new Map<InstKey, { dateIso: string; name: string }>();
    const hasUpcoming = new Set<InstKey>();

    for (const b of bookings) {
      const inst = (b as Booking & { instructor?: User }).instructor;
      if (!inst) continue;
      const dateIso =
        typeof b.dateIso === 'string' ? b.dateIso.slice(0, 10) : (b.dateIso as Date).toISOString().slice(0, 10);
      if (bookingIsUpcoming(dateIso, b.status, todayIso)) {
        hasUpcoming.add(inst.id);
      }
    }

    for (const b of bookings) {
      if (b.status !== 'completed') continue;
      const inst = (b as Booking & { instructor?: User }).instructor;
      if (!inst) continue;
      const dateIso =
        typeof b.dateIso === 'string' ? b.dateIso.slice(0, 10) : (b.dateIso as Date).toISOString().slice(0, 10);
      const prev = lastCompletedByInstructor.get(inst.id);
      if (!prev || dateIso > prev.dateIso) {
        lastCompletedByInstructor.set(inst.id, { dateIso, name: inst.name });
      }
    }

    const pending: PendingInstructorRatingDto[] = [];
    for (const [instructorUserId, { dateIso, name }] of lastCompletedByInstructor) {
      if (rated.has(instructorUserId)) continue;
      if (hasUpcoming.has(instructorUserId)) continue;
      pending.push({
        instructorUserId,
        instructorName: name,
        lastCompletedDateIso: dateIso,
      });
    }
    return pending;
  }

  static async listMyRatings(studentUserId: string): Promise<MyInstructorRatingDto[]> {
    const user = await User.findByPk(studentUserId);
    if (!user || user.accountType !== 'student') return [];

    const rows = await InstructorStudentRating.findAll({
      where: { studentUserId },
      include: [{ model: User, as: 'ratedInstructor', required: true, attributes: ['name'] }],
      order: [['updatedAt', 'DESC']],
    });
    return rows.map((r) => {
      const row = r as InstructorStudentRating & { ratedInstructor?: User };
      return {
        instructorUserId: r.instructorUserId,
        instructorName: row.ratedInstructor?.name ?? '',
        stars: r.stars,
      };
    });
  }

  static async getStatus(studentUserId: string): Promise<InstructorRatingStatusDto> {
    const [pending, myRatings] = await Promise.all([
      this.listPendingForStudent(studentUserId),
      this.listMyRatings(studentUserId),
    ]);
    return { pending, myRatings };
  }

  static async submit(studentUserId: string, instructorUserId: string, stars: number): Promise<void> {
    if (stars < 1 || stars > 5 || !Number.isInteger(stars)) {
      throw new InputValidationError('Stars must be an integer from 1 to 5.', HttpStatusCodesUtil.BAD_REQUEST);
    }

    const student = await User.findByPk(studentUserId);
    if (!student || student.accountType !== 'student') {
      throw new InputValidationError('Student not found.', HttpStatusCodesUtil.NOT_FOUND);
    }

    const instructor = await User.findByPk(instructorUserId);
    if (!instructor || instructor.accountType !== 'instructor') {
      throw new InputValidationError('Instructor not found.', HttpStatusCodesUtil.NOT_FOUND);
    }

    const existing = await InstructorStudentRating.findOne({ where: { studentUserId, instructorUserId } });
    if (existing) {
      throw new InputValidationError(
        'You have already submitted a rating for this instructor; it cannot be changed.',
        HttpStatusCodesUtil.BAD_REQUEST,
      );
    }

    const pending = await this.listPendingForStudent(studentUserId);
    const ok = pending.some((p) => p.instructorUserId === instructorUserId);
    if (!ok) {
      throw new InputValidationError(
        'You can only rate an instructor after your final scheduled lesson with them is completed.',
        HttpStatusCodesUtil.BAD_REQUEST,
      );
    }

    await InstructorStudentRating.create({
      studentUserId,
      instructorUserId,
      stars,
    });
    await this.syncProfileRatingFromReviews(instructorUserId);
  }

  static async removeAllForInstructor(instructorUserId: string): Promise<void> {
    await InstructorStudentRating.destroy({ where: { instructorUserId } });
    await this.syncProfileRatingFromReviews(instructorUserId);
  }

  static async removeAllForStudent(studentUserId: string): Promise<void> {
    const rows = await InstructorStudentRating.findAll({
      where: { studentUserId },
      attributes: ['instructorUserId'],
    });
    const instructorIds = [...new Set(rows.map((r) => r.instructorUserId))];
    await InstructorStudentRating.destroy({ where: { studentUserId } });
    await Promise.all(instructorIds.map((id) => this.syncProfileRatingFromReviews(id)));
  }
}
