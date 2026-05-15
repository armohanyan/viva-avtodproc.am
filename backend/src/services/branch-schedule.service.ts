import { Branch, BranchScheduleRule } from '../models';
import type { BranchScheduleRuleKind } from '../models/branch-schedule-rule.model';
import {
  branchWorkHoursRulesFromText,
  defaultBranchWorkHoursRules,
  normalizeTimeHHMM,
  type BranchScheduleRuleDto,
} from '../utils/booking-slot.util';

function toDto(row: BranchScheduleRule): BranchScheduleRuleDto {
  const ts = row.timeStart != null ? normalizeTimeHHMM(String(row.timeStart)) : null;
  const te = row.timeEnd != null ? normalizeTimeHHMM(String(row.timeEnd)) : null;
  return {
    ruleKind: row.ruleKind as BranchScheduleRuleKind,
    weekday: row.weekday == null ? null : Number(row.weekday),
    dateIso: row.dateIso ? String(row.dateIso).slice(0, 10) : null,
    timeStart: ts,
    timeEnd: te,
    allDay: Boolean(row.allDay),
  };
}

export default class BranchScheduleService {
  static async listForBranch(branchId: number): Promise<BranchScheduleRuleDto[]> {
    const rows = await BranchScheduleRule.findAll({
      where: { branchId },
      order: [
        ['ruleKind', 'ASC'],
        ['weekday', 'ASC'],
        ['dateIso', 'ASC'],
        ['timeStart', 'ASC'],
      ],
    });
    return rows.map(toDto);
  }

  /**
   * Rules used for slot generation and validation: DB rows, else parsed `workHours` text, else 09:00–18:00 daily.
   */
  static async resolveEffectiveRulesForBranch(branchId: number): Promise<BranchScheduleRuleDto[]> {
    const dbRules = await this.listForBranch(branchId);
    if (dbRules.some((r) => r.ruleKind === 'work_hours')) {
      return dbRules;
    }

    const branch = await Branch.findByPk(branchId, { attributes: ['id', 'workHours'] });
    const fromText = branchWorkHoursRulesFromText(branch?.workHours ?? null);
    if (fromText) return fromText;

    return defaultBranchWorkHoursRules();
  }

  static async branchExists(branchId: number): Promise<boolean> {
    const n = await Branch.count({ where: { id: branchId } });
    return n > 0;
  }
}
