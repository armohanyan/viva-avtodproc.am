import { Op } from 'sequelize';
import { Branch, InstructorBranch, InstructorTemporaryBranchTransfer } from '../models';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';
import { yerevanTodayIso } from '../utils/booking-slot.util';

const { InputValidationError } = ErrorsUtil;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export type TemporaryBranchTransferInput = {
  branchId: number;
  startsOn: string;
  /** Null means the instructor stays at this branch from `startsOn` on. */
  endsOn: string | null;
};

export type TemporaryBranchTransferRow = {
  id: number;
  branchId: number;
  startsOn: string;
  endsOn: string | null;
};

const OPEN_ENDED = '9999-12-31';

export function asDateIso(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, '0');
    const d = String(value.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(value ?? '').slice(0, 10);
}

function normalizeEndIso(value: unknown): string | null {
  if (value == null || value === '') return null;
  const iso = asDateIso(value);
  return DATE_RE.test(iso) ? iso : iso;
}

function endSortKey(endsOn: string | null): string {
  return endsOn && DATE_RE.test(endsOn) ? endsOn : OPEN_ENDED;
}

export function temporaryTransferCoversDate(
  transfer: { startsOn: string; endsOn: string | null },
  dateIso: string,
): boolean {
  const day = asDateIso(dateIso);
  const start = asDateIso(transfer.startsOn);
  if (!DATE_RE.test(day) || !DATE_RE.test(start) || day < start) return false;
  const end = normalizeEndIso(transfer.endsOn);
  return end == null || day <= end;
}

/** Home branches, unless a move covers `dateIso` — then only that branch. */
export function effectiveBranchIds(
  permanentBranchIds: readonly number[],
  transfers: readonly { branchId: number; startsOn: string; endsOn: string | null }[],
  dateIso: string,
): number[] {
  const active = transfers
    .filter((transfer) => temporaryTransferCoversDate(transfer, dateIso))
    .sort((a, b) => asDateIso(b.startsOn).localeCompare(asDateIso(a.startsOn)))[0];
  if (active) return [active.branchId];
  return [...permanentBranchIds];
}

/**
 * Branches that still have a bookable day on or after `fromDateIso`.
 * A move with no end date that has already started replaces the home branches.
 */
export function branchIdsRelevantFromDate(
  permanentBranchIds: readonly number[],
  transfers: readonly { branchId: number; startsOn: string; endsOn: string | null }[],
  fromDateIso: string,
): number[] {
  const from = asDateIso(fromDateIso);
  const startedOpen = transfers
    .filter((transfer) => normalizeEndIso(transfer.endsOn) == null && asDateIso(transfer.startsOn) <= from)
    .sort((a, b) => asDateIso(b.startsOn).localeCompare(asDateIso(a.startsOn)))[0];
  if (startedOpen) return [startedOpen.branchId];
  const ids = new Set(permanentBranchIds);
  for (const transfer of transfers) {
    const end = normalizeEndIso(transfer.endsOn);
    if (end == null || end >= from) ids.add(transfer.branchId);
  }
  return [...ids];
}

function rangesOverlap(
  aStart: string,
  aEnd: string | null,
  bStart: string,
  bEnd: string | null,
): boolean {
  return aStart <= endSortKey(bEnd) && bStart <= endSortKey(aEnd);
}

function toTransferRow(row: InstructorTemporaryBranchTransfer): TemporaryBranchTransferRow {
  return {
    id: row.id,
    branchId: row.branchId,
    startsOn: asDateIso(row.startsOn),
    endsOn: normalizeEndIso(row.endsOn),
  };
}

export default class InstructorBranchService {
  static async listBranchIdsForInstructor(instructorUserId: number): Promise<number[]> {
    const links = await InstructorBranch.findAll({
      where: { instructorUserId },
      attributes: ['branchId'],
    });
    return links.map((l) => l.branchId);
  }

  static async listTemporaryTransfers(instructorUserId: number): Promise<TemporaryBranchTransferRow[]> {
    const rows = await InstructorTemporaryBranchTransfer.findAll({
      where: { instructorUserId },
      order: [
        ['startsOn', 'ASC'],
        ['id', 'ASC'],
      ],
    });
    return rows.map(toTransferRow);
  }

  static async listTemporaryTransfersByInstructorIds(
    instructorUserIds: readonly number[],
  ): Promise<Map<number, TemporaryBranchTransferRow[]>> {
    const byInstructor = new Map<number, TemporaryBranchTransferRow[]>();
    if (instructorUserIds.length === 0) return byInstructor;
    const rows = await InstructorTemporaryBranchTransfer.findAll({
      where: { instructorUserId: { [Op.in]: [...instructorUserIds] } },
      order: [
        ['startsOn', 'ASC'],
        ['id', 'ASC'],
      ],
    });
    for (const row of rows) {
      const list = byInstructor.get(row.instructorUserId) ?? [];
      list.push(toTransferRow(row));
      byInstructor.set(row.instructorUserId, list);
    }
    return byInstructor;
  }

  /** Replace temporary transfers. Ranges must not overlap for the same instructor. */
  static async syncTemporaryTransfers(
    instructorUserId: number,
    rows: readonly TemporaryBranchTransferInput[],
  ): Promise<void> {
    const normalized = rows.map((row) => ({
      branchId: row.branchId,
      startsOn: asDateIso(row.startsOn),
      endsOn: normalizeEndIso(row.endsOn),
    }));
    for (const row of normalized) {
      if (!DATE_RE.test(row.startsOn) || (row.endsOn != null && (!DATE_RE.test(row.endsOn) || row.endsOn < row.startsOn))) {
        throw new InputValidationError(
          'Branch move needs a start date, and an end date on or after the start when the move is temporary.',
          HttpStatusCodesUtil.BAD_REQUEST,
        );
      }
      if (!Number.isFinite(row.branchId) || row.branchId <= 0) {
        throw new InputValidationError(
          'Temporary transfer branch was not found.',
          HttpStatusCodesUtil.BAD_REQUEST,
        );
      }
    }
    const sorted = [...normalized].sort(
      (a, b) => a.startsOn.localeCompare(b.startsOn) || endSortKey(a.endsOn).localeCompare(endSortKey(b.endsOn)),
    );
    for (let i = 1; i < sorted.length; i += 1) {
      const prev = sorted[i - 1]!;
      const next = sorted[i]!;
      if (rangesOverlap(prev.startsOn, prev.endsOn, next.startsOn, next.endsOn)) {
        throw new InputValidationError(
          'Temporary transfers cannot overlap.',
          HttpStatusCodesUtil.BAD_REQUEST,
        );
      }
    }
    if (normalized.length > 0) {
      const ids = [...new Set(normalized.map((row) => row.branchId))];
      const branches = await Branch.findAll({
        where: { id: { [Op.in]: ids } },
        attributes: ['id'],
      });
      if (branches.length !== ids.length) {
        throw new InputValidationError(
          'Temporary transfer branch was not found.',
          HttpStatusCodesUtil.BAD_REQUEST,
        );
      }
    }
    await InstructorTemporaryBranchTransfer.destroy({ where: { instructorUserId } });
    if (normalized.length > 0) {
      await InstructorTemporaryBranchTransfer.bulkCreate(
        normalized.map((row) => ({
          instructorUserId,
          branchId: row.branchId,
          startsOn: row.startsOn,
          endsOn: row.endsOn,
        })),
      );
    }
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

  /**
   * Undated flows (a request before a lesson date is chosen): permanent link,
   * or a transfer to this branch that has not ended yet.
   */
  static async instructorMayServeBranch(instructorUserId: number, branchId: number): Promise<boolean> {
    if (!Number.isFinite(instructorUserId) || instructorUserId <= 0) return false;
    if (!Number.isFinite(branchId) || branchId <= 0) return false;
    const permanent = await this.listBranchIdsForInstructor(instructorUserId);
    const transfers = await this.listTemporaryTransfers(instructorUserId);
    return branchIdsRelevantFromDate(permanent, transfers, yerevanTodayIso()).includes(branchId);
  }

  static async assertInstructorMayServeBranch(instructorUserId: number, branchId: number): Promise<void> {
    const ok = await this.instructorMayServeBranch(instructorUserId, branchId);
    if (!ok) {
      throw new InputValidationError(
        'Instructor does not serve this branch.',
        HttpStatusCodesUtil.BAD_REQUEST,
      );
    }
  }

  static async assertInstructorServesBranchOnDates(
    instructorUserId: number,
    branchId: number,
    dateIsos: readonly string[],
    /** Dates already booked on this lesson. Kept even if a later transfer moved the instructor. */
    exemptDateIsos: readonly string[] = [],
  ): Promise<void> {
    const dates = [
      ...new Set(dateIsos.map((value) => asDateIso(value)).filter((day) => DATE_RE.test(day))),
    ];
    if (dates.length === 0) {
      throw new InputValidationError('A lesson date is required.', HttpStatusCodesUtil.BAD_REQUEST);
    }
    const exempt = new Set(exemptDateIsos.map((value) => asDateIso(value)).filter((day) => DATE_RE.test(day)));
    const pending = dates.filter((day) => !exempt.has(day));
    if (pending.length === 0) return;
    const permanent = await this.listBranchIdsForInstructor(instructorUserId);
    const transfers = await this.listTemporaryTransfers(instructorUserId);
    for (const dateIso of pending) {
      const effective = effectiveBranchIds(permanent, transfers, dateIso);
      if (!effective.includes(branchId)) {
        throw new InputValidationError(
          'Instructor does not serve this branch.',
          HttpStatusCodesUtil.BAD_REQUEST,
        );
      }
    }
  }

  /** Instructor user ids permanently linked to `branchId`, or with a transfer there that has not ended. */
  static async instructorUserIdsForBranchList(branchId: number): Promise<number[]> {
    const today = yerevanTodayIso();
    const [branchLinks, transferLinks] = await Promise.all([
      InstructorBranch.findAll({
        where: { branchId },
        attributes: ['instructorUserId'],
      }),
      InstructorTemporaryBranchTransfer.findAll({
        where: {
          branchId,
          [Op.or]: [{ endsOn: null }, { endsOn: { [Op.gte]: today } }],
        },
        attributes: ['instructorUserId'],
      }),
    ]);
    return [
      ...new Set([
        ...branchLinks.map((link) => link.instructorUserId),
        ...transferLinks.map((link) => link.instructorUserId),
      ]),
    ];
  }
}
