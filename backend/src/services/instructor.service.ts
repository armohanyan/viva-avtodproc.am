import { InstructorBranch, InstructorProfile, InstructorScheduleRule, User } from '../models';
import InstructorStudentRatingService from './instructor-student-rating.service';

type ProfileWithUser = InstructorProfile & { user: User };

export type InstructorDto = {
  id: number;
  name: string;
  email: string;
  phone: string;
  years: number;
  rating: number;
  /** Number of student reviews; when positive, `rating` is their average; otherwise public rating is fixed at 5. */
  studentRatingCount: number;
  hourlyPrice: number;
  status: 'active' | 'inactive';
  schedule: string;
  location: string;
  car: string;
  transmission: string;
  imageSrc: string;
  availableBranchIds: number[];
  teachesPractical: boolean;
  teachesTheory: boolean;
};

function clampRating(n: number): number {
  return Math.min(5, Math.max(0, Math.round(n * 10) / 10));
}

function toDto(
  user: User,
  profile: InstructorProfile,
  branchIds: number[],
  effectiveRating: number,
  studentRatingCount: number,
): InstructorDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone ?? '',
    years: profile.years,
    rating: clampRating(effectiveRating),
    studentRatingCount,
    hourlyPrice: profile.hourlyPrice,
    status: profile.status,
    schedule: profile.schedule,
    location: profile.location,
    car: profile.carLabel,
    transmission: profile.transmission,
    imageSrc: profile.imageSrc,
    availableBranchIds: branchIds,
    teachesPractical: profile.teachesPractical,
    teachesTheory: profile.teachesTheory,
  };
}

export default class InstructorService {
  static async list(): Promise<InstructorDto[]> {
    const profiles = await InstructorProfile.findAll({
      include: [{ model: User, as: 'user', required: true }],
    });
    const links = await InstructorBranch.findAll();
    const byInstructor = new Map<number, number[]>();
    for (const l of links) {
      const list = byInstructor.get(l.instructorUserId) ?? [];
      list.push(l.branchId);
      byInstructor.set(l.instructorUserId, list);
    }
    const aggs = await InstructorStudentRatingService.aggregatesForInstructors(profiles.map((p) => p.userId));
    return profiles
      .map((p) => {
        const u = (p as ProfileWithUser).user;
        if (!u) return null;
        const agg = aggs.get(p.userId);
        const studentRatingCount = agg?.count ?? 0;
        const effective = studentRatingCount > 0 ? (agg?.avg ?? p.rating) : 5;
        return toDto(u, p, byInstructor.get(p.userId) ?? [], effective, studentRatingCount);
      })
      .filter((row): row is InstructorDto => row != null);
  }

  static async create(
    input: Omit<InstructorDto, 'id' | 'studentRatingCount' | 'rating'>,
  ): Promise<InstructorDto> {
    /** Public rating is always 5 until students rate; never accept a manual seed. */
    const seedRating = 5;
    const user = await User.create({
      email: input.email.trim().toLowerCase(),
      name: input.name,
      phone: input.phone || null,
      accountType: 'instructor',
      passwordHash: null,
    });
    await InstructorProfile.create({
      userId: user.id,
      years: input.years,
      rating: seedRating,
      hourlyPrice: input.hourlyPrice,
      schedule: input.schedule,
      location: input.location,
      carLabel: input.car,
      transmission: input.transmission,
      imageSrc: input.imageSrc,
      teachesPractical: input.teachesPractical,
      teachesTheory: input.teachesTheory,
      status: input.status,
    });
    await InstructorBranch.destroy({ where: { instructorUserId: user.id } });
    for (const branchId of input.availableBranchIds) {
      await InstructorBranch.create({ instructorUserId: user.id, branchId });
    }
    /** Default daily lunch break for practical booking slots (admin can change in Availability). */
    await InstructorScheduleRule.create({
      instructorUserId: user.id,
      ruleKind: 'lunch',
      weekday: null,
      dateIso: null,
      timeStart: '14:00',
      timeEnd: '15:00',
      allDay: false,
    });
    return (await this.getById(user.id))!;
  }

  static async update(
    id: number,
    patch: Partial<Omit<InstructorDto, 'id' | 'availableBranchIds' | 'studentRatingCount'>> & {
      availableBranchIds?: number[];
    },
  ): Promise<InstructorDto | null> {
    const user = await User.findByPk(id);
    const profile = await InstructorProfile.findOne({ where: { userId: id } });
    if (!user || !profile) return null;

    await user.update({
      ...(patch.email !== undefined ? { email: patch.email.trim().toLowerCase() } : {}),
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.phone !== undefined ? { phone: patch.phone || null } : {}),
    });
    await profile.update({
      ...(patch.years !== undefined ? { years: patch.years } : {}),
      ...(patch.hourlyPrice !== undefined ? { hourlyPrice: patch.hourlyPrice } : {}),
      ...(patch.schedule !== undefined ? { schedule: patch.schedule } : {}),
      ...(patch.location !== undefined ? { location: patch.location } : {}),
      ...(patch.car !== undefined ? { carLabel: patch.car } : {}),
      ...(patch.transmission !== undefined ? { transmission: patch.transmission } : {}),
      ...(patch.imageSrc !== undefined ? { imageSrc: patch.imageSrc } : {}),
      ...(patch.teachesPractical !== undefined ? { teachesPractical: patch.teachesPractical } : {}),
      ...(patch.teachesTheory !== undefined ? { teachesTheory: patch.teachesTheory } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
    });
    if (patch.availableBranchIds !== undefined) {
      await InstructorBranch.destroy({ where: { instructorUserId: id } });
      for (const branchId of patch.availableBranchIds) {
        await InstructorBranch.create({ instructorUserId: id, branchId });
      }
    }
    return this.getById(id);
  }

  static async getById(id: number): Promise<InstructorDto | null> {
    const profile = await InstructorProfile.findOne({
      where: { userId: id },
      include: [{ model: User, as: 'user', required: true }],
    });
    if (!profile) return null;
    const links = await InstructorBranch.findAll({ where: { instructorUserId: id } });
    const u = (profile as ProfileWithUser).user;
    if (!u) return null;
    const aggs = await InstructorStudentRatingService.aggregatesForInstructors([id]);
    const agg = aggs.get(id);
    const studentRatingCount = agg?.count ?? 0;
    const effective = studentRatingCount > 0 ? (agg?.avg ?? profile.rating) : 5;
    return toDto(
      u,
      profile,
      links.map((l) => l.branchId),
      effective,
      studentRatingCount,
    );
  }

  static async remove(id: number): Promise<boolean> {
    await InstructorStudentRatingService.removeAllForInstructor(id);
    await InstructorScheduleRule.destroy({ where: { instructorUserId: id } });
    await InstructorBranch.destroy({ where: { instructorUserId: id } });
    const p = await InstructorProfile.destroy({ where: { userId: id } });
    const u = await User.destroy({ where: { id } });
    return p > 0 && u > 0;
  }
}
