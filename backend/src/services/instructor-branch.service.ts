import { Op } from 'sequelize';
import { Branch, InstructorBranch } from '../models';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { InputValidationError } = ErrorsUtil;

export default class InstructorBranchService {
  static async listBranchIdsForInstructor(instructorUserId: number): Promise<number[]> {
    const links = await InstructorBranch.findAll({
      where: { instructorUserId },
      attributes: ['branchId'],
    });
    return links.map((l) => l.branchId);
  }

  /** Replace instructor ↔ branch links; unknown branch ids are skipped. */
  static async syncBranches(instructorUserId: number, branchIds: readonly number[]): Promise<void> {
    const wantUniq = [...new Set(branchIds)].filter((n) => Number.isFinite(n) && n > 0);
    const existing = await InstructorBranch.findAll({ where: { instructorUserId } });
    const current = new Set(existing.map((e) => e.branchId));
    const want = new Set<number>();
    if (wantUniq.length > 0) {
      const branches = await Branch.findAll({
        where: { id: { [Op.in]: wantUniq } },
        attributes: ['id'],
      });
      for (const b of branches) want.add(b.id);
    }
    for (const branchId of current) {
      if (!want.has(branchId)) {
        await InstructorBranch.destroy({ where: { instructorUserId, branchId } });
      }
    }
    for (const branchId of want) {
      if (!current.has(branchId)) {
        await InstructorBranch.create({ instructorUserId, branchId });
      }
    }
  }

  static async instructorServesBranch(instructorUserId: number, branchId: number): Promise<boolean> {
    if (!Number.isFinite(instructorUserId) || instructorUserId <= 0) return false;
    if (!Number.isFinite(branchId) || branchId <= 0) return false;
    const link = await InstructorBranch.findOne({
      where: { instructorUserId, branchId },
      attributes: ['branchId'],
    });
    return link != null;
  }

  static async assertInstructorServesBranch(instructorUserId: number, branchId: number): Promise<void> {
    const ok = await this.instructorServesBranch(instructorUserId, branchId);
    if (!ok) {
      throw new InputValidationError(
        'Instructor does not serve this branch.',
        HttpStatusCodesUtil.BAD_REQUEST,
      );
    }
  }
}
