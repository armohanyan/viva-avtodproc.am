import { Transaction } from 'sequelize';
import { StudentExtraPractical, StudentProfile } from '../models';
import ErrorsUtil from '../utils/errors.util';
import { HttpStatusCodesUtil } from '../utils';

const { InputValidationError } = ErrorsUtil;

/** Snapshot of package / extra credits consumed for one booking (restored on cancellation). */
export type PrepaidMeta = {
  pkg: number;
  extras: Array<{ id: number; n: number }>;
};

export default class StudentPracticalCreditsService {
  static async availableSlotCount(userId: number, transaction?: Transaction): Promise<number> {
    const profile = await StudentProfile.findOne({ where: { userId }, transaction });
    let pkg = 0;
    if (profile && profile.packageId != null) {
      pkg = Math.max(0, Number(profile.lessonsTotal) - Number(profile.lessonsCompleted));
    }
    const extras = await StudentExtraPractical.findAll({
      where: { userId },
      order: [['purchasedAt', 'ASC']],
      transaction,
    });
    let ex = 0;
    for (const r of extras) {
      ex += Math.max(0, Number(r.practicalTotal) - Number(r.practicalUsed));
    }
    return pkg + ex;
  }

  /**
   * Consumes up to `slots` practical credits (package first, then oldest extra blocks).
   * @throws if fewer than `slots` credits are available.
   */
  static async consumeSlots(userId: number, slots: number, transaction: Transaction): Promise<PrepaidMeta> {
    if (slots <= 0) {
      return { pkg: 0, extras: [] };
    }
    const available = await this.availableSlotCount(userId, transaction);
    if (available < slots) {
      throw new InputValidationError(
        'Not enough included practical lessons remaining for this booking.',
        HttpStatusCodesUtil.BAD_REQUEST,
      );
    }

    let remaining = slots;
    const meta: PrepaidMeta = { pkg: 0, extras: [] };

    const profile = await StudentProfile.findOne({
      where: { userId },
      transaction,
      lock: Transaction.LOCK.UPDATE,
    });
    if (profile && remaining > 0) {
      const cap = Math.max(0, Number(profile.lessonsTotal) - Number(profile.lessonsCompleted));
      const take = Math.min(remaining, cap);
      if (take > 0) {
        await profile.update(
          { lessonsCompleted: Number(profile.lessonsCompleted) + take },
          { transaction },
        );
        meta.pkg = take;
        remaining -= take;
      }
    }

    if (remaining > 0) {
      const extras = await StudentExtraPractical.findAll({
        where: { userId },
        order: [['purchasedAt', 'ASC']],
        transaction,
        lock: Transaction.LOCK.UPDATE,
      });
      for (const r of extras) {
        if (remaining <= 0) break;
        const cap = Math.max(0, Number(r.practicalTotal) - Number(r.practicalUsed));
        const take = Math.min(remaining, cap);
        if (take > 0) {
          await r.update({ practicalUsed: Number(r.practicalUsed) + take }, { transaction });
          meta.extras.push({ id: Number(r.id), n: take });
          remaining -= take;
        }
      }
    }

    if (remaining > 0) {
      throw new InputValidationError(
        'Not enough included practical lessons remaining for this booking.',
        HttpStatusCodesUtil.BAD_REQUEST,
      );
    }
    return meta;
  }

  static async restoreSlots(userId: number, meta: PrepaidMeta, transaction: Transaction): Promise<void> {
    if (meta.pkg <= 0 && (meta.extras?.length ?? 0) === 0) return;

    if (meta.pkg > 0) {
      const profile = await StudentProfile.findOne({
        where: { userId },
        transaction,
        lock: Transaction.LOCK.UPDATE,
      });
      if (profile) {
        const next = Math.max(0, Number(profile.lessonsCompleted) - meta.pkg);
        await profile.update({ lessonsCompleted: next }, { transaction });
      }
    }

    for (const e of meta.extras ?? []) {
      const row = await StudentExtraPractical.findByPk(e.id, { transaction, lock: Transaction.LOCK.UPDATE });
      if (row && row.userId === userId) {
        const next = Math.max(0, Number(row.practicalUsed) - e.n);
        await row.update({ practicalUsed: next }, { transaction });
      }
    }
  }

  static isNonEmptyMeta(m: PrepaidMeta | null | undefined): m is PrepaidMeta {
    return !!m && (m.pkg > 0 || (m.extras?.length ?? 0) > 0);
  }
}
