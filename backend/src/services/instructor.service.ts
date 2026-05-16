import {
  Booking,
  BookingSlot,
  FleetCar,
  FleetCarInstructor,
  InstructorBranch,
  InstructorProfile,
  InstructorScheduleRule,
  OAuthAccount,
  StudentProfile,
  User,
} from '../models';
import { Op } from 'sequelize';
import FleetService from './fleet.service';
import InstructorStudentRatingService from './instructor-student-rating.service';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { ConflictError } = ErrorsUtil;

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
  /** From `fleet_car_instructors` + `fleet_cars` (not stored on profile). */
  car: string;
  transmission: string;
  imageSrc: string;
  availableBranchIds: number[];
  teachesPractical: boolean;
  teachesTheory: boolean;
  /** Fleet vehicles assigned to this instructor (`fleet_car_instructors`). */
  fleetCarIds: number[];
  /**
   * Only on `GET /instructors` when called with a staff Bearer token.
   * `true` if the invite/setup email can still be sent (no password, no OAuth).
   */
  inviteEligible?: boolean;
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
  fleetCarIds: number[],
  derived: { car: string; transmission: string },
  invite?: { eligible: boolean },
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
    car: derived.car,
    transmission: derived.transmission,
    imageSrc: profile.imageSrc,
    availableBranchIds: branchIds,
    teachesPractical: profile.teachesPractical,
    teachesTheory: profile.teachesTheory,
    fleetCarIds,
    ...(invite ? { inviteEligible: invite.eligible } : {}),
  };
}

export default class InstructorService {
  static async list(includeInviteEligibility = false, branchId?: number): Promise<InstructorDto[]> {
    let branchInstructorUserIds: number[] | undefined;
    if (branchId !== undefined) {
      const branchLinks = await InstructorBranch.findAll({
        where: { branchId },
        attributes: ['instructorUserId'],
      });
      branchInstructorUserIds = [...new Set(branchLinks.map((l) => l.instructorUserId))];
      if (branchInstructorUserIds.length === 0) return [];
    }

    const profiles = await InstructorProfile.findAll({
      ...(branchInstructorUserIds !== undefined
        ? { where: { userId: { [Op.in]: branchInstructorUserIds } } }
        : {}),
      include: [{ model: User, as: 'user', required: true }],
    });
    const instructorUserIds = profiles.map((p) => p.userId);
    let oauthUserIds = new Set<number>();
    if (includeInviteEligibility && instructorUserIds.length > 0) {
      const oauthRows = await OAuthAccount.findAll({
        where: { userId: { [Op.in]: instructorUserIds } },
        attributes: ['userId'],
      });
      oauthUserIds = new Set(oauthRows.map((r) => r.userId));
    }

    const links = await InstructorBranch.findAll();
    const byInstructor = new Map<number, number[]>();
    for (const l of links) {
      const list = byInstructor.get(l.instructorUserId) ?? [];
      list.push(l.branchId);
      byInstructor.set(l.instructorUserId, list);
    }
    const aggs = await InstructorStudentRatingService.aggregatesForInstructors(profiles.map((p) => p.userId));
    const fleetByInst = await FleetService.listCarIdsByInstructorIds(profiles.map((p) => p.userId));

    const allFleetCarIds = new Set<number>();
    for (const ids of fleetByInst.values()) {
      ids.forEach((id) => allFleetCarIds.add(id));
    }
    const fleetCars =
      allFleetCarIds.size === 0
        ? []
        : await FleetCar.findAll({ where: { id: [...allFleetCarIds] } });
    const carById = new Map(fleetCars.map((c) => [c.id, c]));

    return profiles
      .map((p) => {
        const u = (p as ProfileWithUser).user;
        if (!u) return null;
        const agg = aggs.get(p.userId);
        const studentRatingCount = agg?.count ?? 0;
        const effective = studentRatingCount > 0 ? (agg?.avg ?? p.rating) : 5;
        const bIds = byInstructor.get(p.userId) ?? [];
        const fcIds = fleetByInst.get(p.userId) ?? [];
        const carsForInst = fcIds.map((id) => carById.get(id)).filter((c): c is FleetCar => c != null);
        const { car, transmission } = FleetService.derivePublicCarFields(carsForInst);
        const invite =
          includeInviteEligibility
            ? {
                eligible: !u.passwordHash && !oauthUserIds.has(u.id),
              }
            : undefined;
        return toDto(u, p, bIds, effective, studentRatingCount, fcIds, { car, transmission }, invite);
      })
      .filter((row): row is InstructorDto => row != null);
  }

  static async create(
    input: Omit<
      InstructorDto,
      'id' | 'studentRatingCount' | 'rating' | 'fleetCarIds' | 'car' | 'transmission'
    > & {
      fleetCarIds?: number[];
    },
  ): Promise<InstructorDto> {
    const emailNorm = input.email.trim().toLowerCase();
    const existingUser = await User.findOne({ where: { email: emailNorm } });
    if (existingUser) {
      const existingProfile = await InstructorProfile.findOne({ where: { userId: existingUser.id } });
      if (existingProfile) {
        throw new ConflictError(
          'An instructor with this email already exists.',
          HttpStatusCodesUtil.CONFLICT,
        );
      }
      throw new ConflictError('This email is already registered.', HttpStatusCodesUtil.CONFLICT);
    }

    const seedRating = 5;
    const user = await User.create({
      email: emailNorm,
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
      imageSrc: input.imageSrc,
      teachesPractical: input.teachesPractical,
      teachesTheory: input.teachesTheory,
      status: input.status,
    });
    await InstructorBranch.destroy({ where: { instructorUserId: user.id } });
    for (const branchId of input.availableBranchIds) {
      await InstructorBranch.create({ instructorUserId: user.id, branchId });
    }
    await InstructorScheduleRule.create({
      instructorUserId: user.id,
      ruleKind: 'lunch',
      weekday: null,
      dateIso: null,
      timeStart: '14:00',
      timeEnd: '15:00',
      allDay: false,
    });
    if (input.fleetCarIds !== undefined) {
      await FleetService.syncInstructorCars(user.id, input.fleetCarIds);
    }
    return (await this.getById(user.id))!;
  }

  static async update(
    id: number,
    patch: Partial<
      Omit<InstructorDto, 'id' | 'availableBranchIds' | 'studentRatingCount' | 'car' | 'transmission'>
    > & {
      availableBranchIds?: number[];
      fleetCarIds?: number[];
    },
  ): Promise<InstructorDto | null> {
    const user = await User.findByPk(id);
    const profile = await InstructorProfile.findOne({ where: { userId: id } });
    if (!user || !profile) return null;

    if (patch.email !== undefined) {
      const emailNorm = patch.email.trim().toLowerCase();
      const other = await User.findOne({ where: { email: emailNorm } });
      if (other && other.id !== id) {
        throw new ConflictError('This email is already in use.', HttpStatusCodesUtil.CONFLICT);
      }
    }

    await user.update({
      ...(patch.email !== undefined ? { email: patch.email.trim().toLowerCase() } : {}),
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.phone !== undefined ? { phone: patch.phone || null } : {}),
    });
    await profile.update({
      ...(patch.years !== undefined ? { years: patch.years } : {}),
      ...(patch.hourlyPrice !== undefined ? { hourlyPrice: patch.hourlyPrice } : {}),
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
    if (patch.fleetCarIds !== undefined) {
      await FleetService.syncInstructorCars(id, patch.fleetCarIds);
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
    const branchIds = links.map((l) => l.branchId);
    const fleetCarIds = await FleetService.listCarIdsForInstructor(id);

    const fleetCars =
      fleetCarIds.length === 0
        ? []
        : await FleetCar.findAll({ where: { id: { [Op.in]: fleetCarIds } } });
    const { car, transmission } = FleetService.derivePublicCarFields(fleetCars);

    return toDto(u, profile, branchIds, effective, studentRatingCount, fleetCarIds, {
      car,
      transmission,
    });
  }

  static async remove(id: number): Promise<boolean> {
    await InstructorStudentRatingService.removeAllForInstructor(id);
    await BookingSlot.update({ instructorUserId: null }, { where: { instructorUserId: id } });
    await Booking.update({ instructorUserId: null }, { where: { instructorUserId: id } });
    await StudentProfile.update({ instructorUserId: null }, { where: { instructorUserId: id } });
    await InstructorScheduleRule.destroy({ where: { instructorUserId: id } });
    await FleetCarInstructor.destroy({ where: { instructorUserId: id } });
    await InstructorBranch.destroy({ where: { instructorUserId: id } });
    const p = await InstructorProfile.destroy({ where: { userId: id } });
    const u = await User.destroy({ where: { id } });
    return p > 0 && u > 0;
  }
}
