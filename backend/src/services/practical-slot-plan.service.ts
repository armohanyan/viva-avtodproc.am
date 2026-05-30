import { AppSetting, BranchPracticalSlotPlan, InstructorPracticalSlotPlan } from '../models';
import {
  DEFAULT_PRACTICAL_SLOT_PLAN,
  normalizePracticalSlotPlan,
  PRACTICAL_SLOT_PLAN_SETTING_KEY,
  resolveEffectiveBookableTimes,
  type PracticalSlotPlanRow,
} from '../utils/practical-slot-plan.util';

async function loadLegacyGlobalPlan(): Promise<PracticalSlotPlanRow[] | null> {
  const row = await AppSetting.findOne({ where: { settingKey: PRACTICAL_SLOT_PLAN_SETTING_KEY } });
  if (!row?.valueText) return null;
  try {
    return normalizePracticalSlotPlan(JSON.parse(row.valueText));
  } catch {
    return null;
  }
}

export default class PracticalSlotPlanService {
  static async getBranchPlan(branchId: number): Promise<PracticalSlotPlanRow[]> {
    return this.getPlan(branchId);
  }

  static async getPlan(branchId: number): Promise<PracticalSlotPlanRow[]> {
    if (!Number.isFinite(branchId) || branchId <= 0) {
      return DEFAULT_PRACTICAL_SLOT_PLAN.map((r) => ({ ...r }));
    }
    const row = await BranchPracticalSlotPlan.findOne({ where: { branchId } });
    if (row?.planJson) {
      try {
        return normalizePracticalSlotPlan(JSON.parse(row.planJson));
      } catch {
        /* fall through */
      }
    }
    const legacy = await loadLegacyGlobalPlan();
    if (legacy) return legacy;
    return DEFAULT_PRACTICAL_SLOT_PLAN.map((r) => ({ ...r }));
  }

  static async saveBranchPlan(branchId: number, plan: readonly PracticalSlotPlanRow[]): Promise<PracticalSlotPlanRow[]> {
    return this.savePlan(branchId, plan);
  }

  static async savePlan(branchId: number, plan: readonly PracticalSlotPlanRow[]): Promise<PracticalSlotPlanRow[]> {
    if (!Number.isFinite(branchId) || branchId <= 0) {
      throw new Error('branchId is required');
    }
    const normalized = normalizePracticalSlotPlan(plan);
    const json = JSON.stringify(normalized);
    const existing = await BranchPracticalSlotPlan.findOne({ where: { branchId } });
    if (existing) {
      await existing.update({ planJson: json });
    } else {
      await BranchPracticalSlotPlan.create({ branchId, planJson: json });
    }
    return normalized;
  }

  static async instructorHasCustomPlan(instructorUserId: number): Promise<boolean> {
    if (!Number.isFinite(instructorUserId) || instructorUserId <= 0) return false;
    const row = await InstructorPracticalSlotPlan.findOne({
      where: { instructorUserId },
      attributes: ['id'],
    });
    return row != null;
  }

  static async getInstructorPlanMeta(
    instructorUserId: number,
  ): Promise<{ rows: PracticalSlotPlanRow[]; customized: boolean }> {
    if (!Number.isFinite(instructorUserId) || instructorUserId <= 0) {
      return { rows: DEFAULT_PRACTICAL_SLOT_PLAN.map((r) => ({ ...r })), customized: false };
    }
    const row = await InstructorPracticalSlotPlan.findOne({ where: { instructorUserId } });
    if (row?.planJson) {
      try {
        return {
          rows: normalizePracticalSlotPlan(JSON.parse(row.planJson)),
          customized: true,
        };
      } catch {
        /* fall through */
      }
    }
    return { rows: DEFAULT_PRACTICAL_SLOT_PLAN.map((r) => ({ ...r })), customized: false };
  }

  static async getInstructorPlan(instructorUserId: number): Promise<PracticalSlotPlanRow[]> {
    const meta = await this.getInstructorPlanMeta(instructorUserId);
    return meta.rows;
  }

  static async saveInstructorPlan(
    instructorUserId: number,
    plan: readonly PracticalSlotPlanRow[],
  ): Promise<PracticalSlotPlanRow[]> {
    if (!Number.isFinite(instructorUserId) || instructorUserId <= 0) {
      throw new Error('instructorUserId is required');
    }
    const normalized = normalizePracticalSlotPlan(plan);
    const json = JSON.stringify(normalized);
    const existing = await InstructorPracticalSlotPlan.findOne({ where: { instructorUserId } });
    if (existing) {
      await existing.update({ planJson: json });
    } else {
      await InstructorPracticalSlotPlan.create({ instructorUserId, planJson: json });
    }
    return normalized;
  }

  /** Bookable practical starts (branch grid; ∩ instructor plan only when instructor saved custom slots). */
  static async getEffectiveBookableTimes(branchId: number, instructorUserId: number): Promise<string[]> {
    const [branchPlan, instructorMeta] = await Promise.all([
      this.getBranchPlan(branchId),
      this.getInstructorPlanMeta(instructorUserId),
    ]);
    return resolveEffectiveBookableTimes(branchPlan, instructorMeta.rows, instructorMeta.customized);
  }

  static async listConfiguredBranchIds(): Promise<number[]> {
    const rows = await BranchPracticalSlotPlan.findAll({ attributes: ['branchId'] });
    return rows.map((r) => Number(r.branchId)).filter((id) => Number.isFinite(id) && id > 0);
  }
}
