import { Op, Transaction } from 'sequelize';
import { InstructorBranch, InstructorProfile, TheoryCohort, TheoryCohortInstructor, User } from '../models';
import InstructorBranchService from './instructor-branch.service';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { InputValidationError } = ErrorsUtil;

function uniqPositiveIds(ids: readonly number[]): number[] {
  return [...new Set(ids)].filter((n) => Number.isFinite(n) && n > 0).map((n) => Math.round(n));
}

export default class TheoryCohortInstructorService {
  static async listInstructorUserIdsForCohort(cohortId: number): Promise<number[]> {
    const links = await TheoryCohortInstructor.findAll({
      where: { cohortId },
      attributes: ['instructorUserId'],
      order: [['instructorUserId', 'ASC']],
    });
    return links.map((l) => l.instructorUserId);
  }

  static async listInstructorUserIdsByCohortIds(
    cohortIds: readonly number[],
  ): Promise<Map<number, number[]>> {
    const out = new Map<number, number[]>();
    const uniq = [...new Set(cohortIds)].filter((id) => Number.isFinite(id) && id > 0);
    if (uniq.length === 0) return out;
    const links = await TheoryCohortInstructor.findAll({
      where: { cohortId: { [Op.in]: uniq } },
      attributes: ['cohortId', 'instructorUserId'],
      order: [
        ['cohortId', 'ASC'],
        ['instructorUserId', 'ASC'],
      ],
    });
    for (const link of links) {
      const list = out.get(link.cohortId) ?? [];
      list.push(link.instructorUserId);
      out.set(link.cohortId, list);
    }
    return out;
  }

  static async assertAssignableTheoryInstructors(
    instructorUserIds: readonly number[],
    branchId: number,
  ): Promise<void> {
    const ids = uniqPositiveIds(instructorUserIds);
    if (ids.length === 0) {
      throw new InputValidationError(
        'At least one theory instructor is required.',
        HttpStatusCodesUtil.BAD_REQUEST,
      );
    }
    const users = await User.findAll({
      where: { id: { [Op.in]: ids }, accountType: 'instructor' },
      attributes: ['id'],
    });
    const foundIds = new Set(users.map((u) => u.id));
    for (const id of ids) {
      if (!foundIds.has(id)) {
        throw new InputValidationError('Instructor not found.', HttpStatusCodesUtil.BAD_REQUEST);
      }
      await InstructorBranchService.assertInstructorServesBranch(id, branchId);
    }
    const profiles = await InstructorProfile.findAll({
      where: { userId: { [Op.in]: ids } },
      attributes: ['userId', 'teachesTheory'],
    });
    const profileByUser = new Map(profiles.map((p) => [p.userId, p]));
    for (const id of ids) {
      const profile = profileByUser.get(id);
      if (!profile?.teachesTheory) {
        throw new InputValidationError(
          'Only instructors who teach theory can be assigned to a theory group.',
          HttpStatusCodesUtil.BAD_REQUEST,
        );
      }
    }
  }

  static async syncInstructors(
    cohortId: number,
    instructorUserIds: readonly number[],
    branchId: number,
    t?: Transaction,
  ): Promise<void> {
    const want = uniqPositiveIds(instructorUserIds);
    await this.assertAssignableTheoryInstructors(want, branchId);
    const existing = await TheoryCohortInstructor.findAll({
      where: { cohortId },
      transaction: t,
    });
    const current = new Set(existing.map((e) => e.instructorUserId));
    const wantSet = new Set(want);
    for (const instructorUserId of current) {
      if (!wantSet.has(instructorUserId)) {
        await TheoryCohortInstructor.destroy({ where: { cohortId, instructorUserId }, transaction: t });
      }
    }
    for (const instructorUserId of want) {
      if (!current.has(instructorUserId)) {
        await TheoryCohortInstructor.create({ cohortId, instructorUserId }, { transaction: t });
      }
    }
  }

  static async removeAllForCohort(cohortId: number, t: Transaction): Promise<void> {
    await TheoryCohortInstructor.destroy({ where: { cohortId }, transaction: t });
  }

  /** Ordered instructor ids for a cohort (junction table, then legacy single column). */
  static async resolveInstructorUserIds(cohort: TheoryCohort): Promise<number[]> {
    const linked = await this.listInstructorUserIdsForCohort(cohort.id);
    if (linked.length > 0) return linked;
    const legacy =
      cohort.instructorUserId != null &&
      Number.isFinite(Number(cohort.instructorUserId)) &&
      Number(cohort.instructorUserId) > 0
        ? [Math.round(Number(cohort.instructorUserId))]
        : [];
    if (legacy.length > 0) return legacy;
    const name = cohort.instructorName?.trim();
    if (!name) return [];
    const firstName = name.split(',')[0]?.trim() ?? name;
    const links = await InstructorBranch.findAll({ where: { branchId: cohort.branchId } });
    const branchInstructorIds = links.map((l) => l.instructorUserId);
    const instructor = await User.findOne({
      where: {
        name: firstName,
        accountType: 'instructor',
        ...(branchInstructorIds.length > 0 ? { id: { [Op.in]: branchInstructorIds } } : {}),
      },
      attributes: ['id'],
    });
    return instructor ? [instructor.id] : [];
  }

  static async resolvePrimaryInstructorUserId(cohort: TheoryCohort): Promise<number | null> {
    const ids = await this.resolveInstructorUserIds(cohort);
    return ids[0] ?? null;
  }

  static async buildInstructorDisplayName(instructorUserIds: readonly number[]): Promise<string> {
    const ids = uniqPositiveIds(instructorUserIds);
    if (ids.length === 0) return '';
    const users = await User.findAll({
      where: { id: { [Op.in]: ids } },
      attributes: ['id', 'name'],
    });
    const byId = new Map(users.map((u) => [u.id, u.name?.trim() || '']));
    return ids
      .map((id) => byId.get(id))
      .filter((n): n is string => Boolean(n))
      .join(', ');
  }
}
