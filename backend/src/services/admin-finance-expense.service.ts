import { Op } from 'sequelize';
import {
  FLEET_EXPENSE_PURPOSE_OTHER_AM,
  isValidCarExpenseSubtype,
  purposeFromSubtypeForm,
  subtypeFormFromStored,
} from '../constants/fleet-expense-purpose';
import {
  Branch,
  CarExpense,
  FinanceExpense,
  FinanceTransaction,
  FleetCar,
  InstructorProfile,
  User,
} from '../models';
import FleetService from './fleet.service';
import FinanceService from './finance.service';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { InputValidationError, ResourceNotFoundError } = ErrorsUtil;

export type AdminExpensePurpose = 'car' | 'branch_rent' | 'salary' | 'other';
export type AdminExpenseSource = 'car_expense' | 'finance_transaction' | 'finance_expense';

export type AdminFinanceExpenseDto = {
  id: string;
  title: string;
  amount: number;
  date: string;
  purpose: AdminExpensePurpose;
  purposeLabel: string;
  relatedEntityType: 'car' | 'branch' | 'instructor' | null;
  relatedEntityId: string | null;
  relatedEntityLabel: string | null;
  expenseSubtype: string | null;
  customPurposeText: string | null;
  notes: string | null;
  createdByAdminId: number | null;
  createdByAdminName: string | null;
  source: AdminExpenseSource;
};

export type CreateAdminFinanceExpenseInput = {
  title: string;
  amount: number;
  date: string;
  purpose: AdminExpensePurpose;
  relatedEntityType?: 'car' | 'branch' | 'instructor' | null;
  relatedEntityId?: string | null;
  expenseSubtype?: string | null;
  customPurposeText?: string | null;
  notes?: string | null;
};

const PURPOSE_LABELS: Record<AdminExpensePurpose, string> = {
  car: 'Մեքենայի ծախս',
  branch_rent: 'Գրասենյակի / մասնաճյուղի վարձ',
  salary: 'Աշխատավարձ',
  other: 'Այլ',
};

const OTHER_ENTITY_AM = 'Այլ';

function dateOnly(raw: unknown): string {
  if (typeof raw === 'string') return raw.slice(0, 10);
  if (raw instanceof Date) return raw.toISOString().slice(0, 10);
  return String(raw).slice(0, 10);
}

function rowCreatedAtIso(row: FinanceTransaction): string {
  const created = (row as unknown as { createdAt?: Date | string }).createdAt;
  if (created instanceof Date) return created.toISOString();
  if (typeof created === 'string') return created;
  return new Date().toISOString();
}

function parseCompositeId(id: string): { source: AdminExpenseSource; numericId: number } | null {
  const m = /^(car|tx|fe):(\d+)$/.exec(id);
  if (!m) return null;
  const source =
    m[1] === 'car' ? 'car_expense' : m[1] === 'tx' ? 'finance_transaction' : 'finance_expense';
  return { source, numericId: Number(m[2]) };
}

async function adminNameByUserId(userId: number | null | undefined): Promise<string | null> {
  if (!userId) return null;
  const u = await User.findByPk(userId, { attributes: ['id', 'name', 'email'] });
  if (!u) return null;
  return u.name?.trim() || u.email || null;
}

export default class AdminFinanceExpenseService {
  static async list(): Promise<AdminFinanceExpenseDto[]> {
    const [cars, branches, carRows, txRows, feRows] = await Promise.all([
      FleetCar.findAll({ attributes: ['id', 'plate'], order: [['plate', 'ASC']] }),
      Branch.findAll({ attributes: ['id', 'name'], order: [['name', 'ASC']] }),
      CarExpense.findAll({ order: [['date', 'DESC'], ['id', 'DESC']] }),
      FinanceTransaction.findAll({
        where: {
          entryType: 'expense',
          source: 'manual',
          expenseKind: { [Op.ne]: 'booking_refund' },
        },
        order: [['createdAt', 'DESC']],
      }),
      FinanceExpense.findAll({ order: [['date', 'DESC'], ['id', 'DESC']] }),
    ]);

    const plateByCarId = new Map(cars.map((c) => [c.id, c.plate]));
    const branchNameById = new Map(branches.map((b) => [b.id, b.name]));

    const instructorIds = new Set<number>();
    for (const fe of feRows) {
      if (fe.relatedEntityType === 'instructor' && fe.relatedEntityId) {
        const n = Number(fe.relatedEntityId);
        if (Number.isFinite(n)) instructorIds.add(n);
      }
    }
    for (const tx of txRows) {
      if (tx.expenseKind === 'salary' || tx.expenseKind === 'hourly_rate') {
        // legacy rows may only have employeeName
      }
    }

    const instructorNameById = new Map<number, string>();
    if (instructorIds.size > 0) {
      const profiles = await InstructorProfile.findAll({
        where: { userId: { [Op.in]: [...instructorIds] } },
        include: [{ model: User, as: 'user', required: true, attributes: ['id', 'name', 'email'] }],
      });
      for (const p of profiles) {
        const row = p as InstructorProfile & { user?: User };
        const label = row.user?.name?.trim() || row.user?.email || String(p.userId);
        instructorNameById.set(p.userId, label);
      }
    }

    const out: AdminFinanceExpenseDto[] = [];

    for (const e of carRows) {
      const plate = plateByCarId.get(e.carId) ?? String(e.carId);
      const { choice, custom } = subtypeFormFromStored(e.purpose);
      const title = (e.title?.trim() || e.purpose).trim();
      out.push({
        id: `car:${e.id}`,
        title,
        amount: e.amount,
        date: dateOnly(e.date),
        purpose: 'car',
        purposeLabel: PURPOSE_LABELS.car,
        relatedEntityType: 'car',
        relatedEntityId: String(e.carId),
        relatedEntityLabel: plate,
        expenseSubtype: choice,
        customPurposeText: choice === FLEET_EXPENSE_PURPOSE_OTHER_AM ? custom || null : null,
        notes: e.note?.trim() || null,
        createdByAdminId: null,
        createdByAdminName: null,
        source: 'car_expense',
      });
    }

    for (const tx of txRows) {
      if (tx.expenseKind === 'booking_refund') continue;

      let purpose: AdminExpensePurpose = 'other';
      if (tx.expenseKind === 'rent') purpose = 'branch_rent';
      else if (tx.expenseKind === 'salary' || tx.expenseKind === 'hourly_rate') purpose = 'salary';

      const branchLabel = branchNameById.get(tx.branchId) ?? String(tx.branchId);
      const relatedLabel =
        purpose === 'salary'
          ? tx.employeeName?.trim() || tx.customer?.trim() || '—'
          : branchLabel;

      out.push({
        id: `tx:${tx.id}`,
        title: tx.description.trim(),
        amount: tx.grossAmd,
        date: dateOnly(rowCreatedAtIso(tx)),
        purpose,
        purposeLabel: PURPOSE_LABELS[purpose],
        relatedEntityType: purpose === 'branch_rent' ? 'branch' : purpose === 'salary' ? 'instructor' : null,
        relatedEntityId: purpose === 'branch_rent' ? String(tx.branchId) : null,
        relatedEntityLabel: relatedLabel,
        expenseSubtype: null,
        customPurposeText: null,
        notes: null,
        createdByAdminId: null,
        createdByAdminName: null,
        source: 'finance_transaction',
      });
    }

    for (const fe of feRows) {
      let relatedLabel: string | null = null;
      if (fe.relatedEntityType === 'branch' && fe.relatedEntityId) {
        if (fe.relatedEntityId === OTHER_ENTITY_AM || fe.customPurposeText) {
          relatedLabel = fe.customPurposeText?.trim() || OTHER_ENTITY_AM;
        } else {
          const bid = Number(fe.relatedEntityId);
          relatedLabel = branchNameById.get(bid) ?? fe.relatedEntityId;
        }
      } else if (fe.relatedEntityType === 'instructor' && fe.relatedEntityId) {
        if (fe.relatedEntityId === OTHER_ENTITY_AM || fe.customPurposeText) {
          relatedLabel = fe.customPurposeText?.trim() || OTHER_ENTITY_AM;
        } else {
          const iid = Number(fe.relatedEntityId);
          relatedLabel = instructorNameById.get(iid) ?? fe.relatedEntityId;
        }
      } else if (fe.purpose === 'other') {
        relatedLabel = fe.customPurposeText?.trim() || null;
      }

      out.push({
        id: `fe:${fe.id}`,
        title: fe.title,
        amount: fe.amount,
        date: dateOnly(fe.date),
        purpose: fe.purpose,
        purposeLabel: PURPOSE_LABELS[fe.purpose],
        relatedEntityType: fe.relatedEntityType ?? null,
        relatedEntityId: fe.relatedEntityId ?? null,
        relatedEntityLabel: relatedLabel,
        expenseSubtype: fe.expenseSubtype ?? null,
        customPurposeText: fe.customPurposeText ?? null,
        notes: fe.notes?.trim() || null,
        createdByAdminId: fe.createdByUserId ?? null,
        createdByAdminName: await adminNameByUserId(fe.createdByUserId),
        source: 'finance_expense',
      });
    }

    out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    return out;
  }

  static async create(input: CreateAdminFinanceExpenseInput, createdByUserId?: number): Promise<AdminFinanceExpenseDto> {
    const title = input.title.trim();
    const amount = Math.round(input.amount);
    const date = input.date.slice(0, 10);
    const notes = input.notes?.trim() || null;

    if (!title || amount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new InputValidationError('Լրացրեք բոլոր պարտադիր դաշտերը', HttpStatusCodesUtil.BAD_REQUEST);
    }

    switch (input.purpose) {
      case 'car':
        return this.createCarExpense(input, title, amount, date, notes);
      case 'branch_rent':
      case 'salary':
      case 'other':
        return this.createFinanceExpense(input, title, amount, date, notes, createdByUserId);
      default:
        throw new InputValidationError('Անվավեր ծախսի նպատակ', HttpStatusCodesUtil.BAD_REQUEST);
    }
  }

  private static async createCarExpense(
    input: CreateAdminFinanceExpenseInput,
    title: string,
    amount: number,
    date: string,
    notes: string | null,
  ): Promise<AdminFinanceExpenseDto> {
    const carId = Number(input.relatedEntityId);
    if (!Number.isFinite(carId) || carId <= 0) {
      throw new InputValidationError('Ընտրեք մեքենան', HttpStatusCodesUtil.BAD_REQUEST);
    }
    const car = await FleetCar.findByPk(carId);
    if (!car) {
      throw new InputValidationError('Մեքենան չի գտնվել', HttpStatusCodesUtil.BAD_REQUEST);
    }

    const subtype = (input.expenseSubtype ?? '').trim();
    if (!subtype || !isValidCarExpenseSubtype(subtype)) {
      throw new InputValidationError('Ընտրեք ծախսի տեսակը', HttpStatusCodesUtil.BAD_REQUEST);
    }
    const custom = (input.customPurposeText ?? '').trim();
    if (subtype === FLEET_EXPENSE_PURPOSE_OTHER_AM && !custom) {
      throw new InputValidationError('Նշեք ծախսի տեսակը', HttpStatusCodesUtil.BAD_REQUEST);
    }
    const purpose = purposeFromSubtypeForm(subtype, custom);
    if (!purpose) {
      throw new InputValidationError('Ընտրեք ծախսի տեսակը', HttpStatusCodesUtil.BAD_REQUEST);
    }

    const row = await FleetService.addExpense({
      carId,
      title,
      amount,
      date,
      purpose,
      note: notes ?? undefined,
    });

    const list = await this.list();
    const created = list.find((x) => x.id === `car:${row.id}`);
    if (!created) {
      throw new ResourceNotFoundError('Expense not found after create', HttpStatusCodesUtil.INTERNAL_SERVER_ERROR ?? 500);
    }
    return created;
  }

  private static async createFinanceExpense(
    input: CreateAdminFinanceExpenseInput,
    title: string,
    amount: number,
    date: string,
    notes: string | null,
    createdByUserId?: number,
  ): Promise<AdminFinanceExpenseDto> {
    const purpose = input.purpose as 'branch_rent' | 'salary' | 'other';
    let relatedEntityType: 'branch' | 'instructor' | null = null;
    let relatedEntityId: string | null = null;
    let expenseSubtype: string | null = (input.expenseSubtype ?? '').trim() || null;
    let customPurposeText: string | null = (input.customPurposeText ?? '').trim() || null;

    if (purpose === 'branch_rent') {
      relatedEntityType = 'branch';
      const pick = (input.relatedEntityId ?? '').trim();
      if (!pick) {
        throw new InputValidationError('Ընտրեք մասնաճյուղը', HttpStatusCodesUtil.BAD_REQUEST);
      }
      if (pick === OTHER_ENTITY_AM) {
        relatedEntityId = OTHER_ENTITY_AM;
        if (!customPurposeText) {
          throw new InputValidationError('Նշեք մասնաճյուղը կամ նպատակը', HttpStatusCodesUtil.BAD_REQUEST);
        }
      } else {
        const branchId = Number(pick);
        if (!Number.isFinite(branchId) || !(await Branch.findByPk(branchId))) {
          throw new InputValidationError('Մասնաճյուղը չի գտնվել', HttpStatusCodesUtil.BAD_REQUEST);
        }
        relatedEntityId = String(branchId);
        customPurposeText = null;
      }
      expenseSubtype = expenseSubtype === OTHER_ENTITY_AM ? OTHER_ENTITY_AM : null;
    } else if (purpose === 'salary') {
      relatedEntityType = 'instructor';
      const pick = (input.relatedEntityId ?? '').trim();
      if (!pick) {
        throw new InputValidationError('Ընտրեք աշխատակցին', HttpStatusCodesUtil.BAD_REQUEST);
      }
      if (pick === OTHER_ENTITY_AM) {
        relatedEntityId = OTHER_ENTITY_AM;
        if (!customPurposeText) {
          throw new InputValidationError('Նշեք աշխատակցին', HttpStatusCodesUtil.BAD_REQUEST);
        }
      } else {
        const instructorUserId = Number(pick);
        const profile = await InstructorProfile.findOne({ where: { userId: instructorUserId } });
        if (!profile) {
          throw new InputValidationError('Աշխատակիցը չի գտնվել', HttpStatusCodesUtil.BAD_REQUEST);
        }
        relatedEntityId = String(instructorUserId);
        customPurposeText = null;
      }
    } else {
      relatedEntityType = null;
      relatedEntityId = null;
      if (!customPurposeText) {
        throw new InputValidationError('Նկարագրեք ծախսի նպատակը', HttpStatusCodesUtil.BAD_REQUEST);
      }
    }

    const row = await FinanceExpense.create({
      title,
      amount,
      date,
      purpose,
      relatedEntityType,
      relatedEntityId,
      expenseSubtype,
      customPurposeText,
      notes,
      createdByUserId: createdByUserId ?? null,
    });

    const list = await this.list();
    const created = list.find((x) => x.id === `fe:${row.id}`);
    if (!created) {
      throw new ResourceNotFoundError('Expense not found after create', HttpStatusCodesUtil.INTERNAL_SERVER_ERROR ?? 500);
    }
    return created;
  }

  static async update(id: string, patch: Partial<CreateAdminFinanceExpenseInput>): Promise<AdminFinanceExpenseDto> {
    const parsed = parseCompositeId(id);
    if (!parsed) {
      throw new InputValidationError('Անվավեր ծախսի նույնացուցիչ', HttpStatusCodesUtil.BAD_REQUEST);
    }

    if (parsed.source === 'car_expense') {
      return this.updateCarExpense(parsed.numericId, patch);
    }
    if (parsed.source === 'finance_transaction') {
      return this.updateFinanceTransaction(parsed.numericId, patch);
    }
    return this.updateFinanceExpense(parsed.numericId, patch);
  }

  private static async updateCarExpense(
    id: number,
    patch: Partial<CreateAdminFinanceExpenseInput>,
  ): Promise<AdminFinanceExpenseDto> {
    const row = await CarExpense.findByPk(id);
    if (!row) {
      throw new ResourceNotFoundError('Ծախսը չի գտնվել', HttpStatusCodesUtil.NOT_FOUND);
    }

    const nextTitle = patch.title?.trim() || row.title?.trim() || row.purpose;
    let nextPurpose = row.purpose;
    if (patch.expenseSubtype) {
      const subtype = patch.expenseSubtype.trim();
      const custom = (patch.customPurposeText ?? '').trim();
      if (subtype === FLEET_EXPENSE_PURPOSE_OTHER_AM && !custom) {
        throw new InputValidationError('Նշեք ծախսի տեսակը', HttpStatusCodesUtil.BAD_REQUEST);
      }
      nextPurpose = purposeFromSubtypeForm(subtype, custom);
    }

    const nextCarId =
      patch.relatedEntityId != null ? Number(patch.relatedEntityId) : undefined;
    await FleetService.updateExpense(id, {
      title: nextTitle,
      ...(Number.isFinite(nextCarId) && nextCarId! > 0 ? { carId: nextCarId } : {}),
      ...(patch.amount !== undefined ? { amount: Math.round(patch.amount) } : {}),
      ...(patch.date !== undefined ? { date: patch.date.slice(0, 10) } : {}),
      purpose: nextPurpose,
      ...(patch.notes !== undefined ? { note: patch.notes?.trim() || null } : {}),
    });

    const list = await this.list();
    const updated = list.find((x) => x.id === `car:${id}`);
    if (!updated) {
      throw new ResourceNotFoundError('Ծախսը չի գտնվել', HttpStatusCodesUtil.NOT_FOUND);
    }
    return updated;
  }

  private static async updateFinanceTransaction(
    id: number,
    patch: Partial<CreateAdminFinanceExpenseInput>,
  ): Promise<AdminFinanceExpenseDto> {
    const row = await FinanceTransaction.findByPk(id);
    if (!row || row.entryType !== 'expense') {
      throw new ResourceNotFoundError('Ծախսը չի գտնվել', HttpStatusCodesUtil.NOT_FOUND);
    }

    await FinanceService.updateManual(id, {
      ...(patch.title !== undefined ? { description: patch.title.trim() } : {}),
      ...(patch.amount !== undefined ? { grossAmd: Math.round(patch.amount) } : {}),
      ...(patch.date !== undefined ? { createdAt: new Date(`${patch.date.slice(0, 10)}T12:00:00`).toISOString() } : {}),
    });

    const list = await this.list();
    const updated = list.find((x) => x.id === `tx:${id}`);
    if (!updated) {
      throw new ResourceNotFoundError('Ծախսը չի գտնվել', HttpStatusCodesUtil.NOT_FOUND);
    }
    return updated;
  }

  private static async updateFinanceExpense(
    id: number,
    patch: Partial<CreateAdminFinanceExpenseInput>,
  ): Promise<AdminFinanceExpenseDto> {
    const row = await FinanceExpense.findByPk(id);
    if (!row) {
      throw new ResourceNotFoundError('Ծախսը չի գտնվել', HttpStatusCodesUtil.NOT_FOUND);
    }

    await row.update({
      ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
      ...(patch.amount !== undefined ? { amount: Math.round(patch.amount) } : {}),
      ...(patch.date !== undefined ? { date: patch.date.slice(0, 10) } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes?.trim() || null } : {}),
      ...(patch.customPurposeText !== undefined ? { customPurposeText: patch.customPurposeText?.trim() || null } : {}),
    });

    const list = await this.list();
    const updated = list.find((x) => x.id === `fe:${id}`);
    if (!updated) {
      throw new ResourceNotFoundError('Ծախսը չի գտնվել', HttpStatusCodesUtil.NOT_FOUND);
    }
    return updated;
  }

  static async remove(id: string): Promise<void> {
    const parsed = parseCompositeId(id);
    if (!parsed) {
      throw new InputValidationError('Անվավեր ծախսի նույնացուցիչ', HttpStatusCodesUtil.BAD_REQUEST);
    }

    if (parsed.source === 'car_expense') {
      const ok = await FleetService.removeExpense(parsed.numericId);
      if (!ok) throw new ResourceNotFoundError('Ծախսը չի գտնվել', HttpStatusCodesUtil.NOT_FOUND);
      return;
    }
    if (parsed.source === 'finance_transaction') {
      await FinanceService.removeManual(parsed.numericId);
      return;
    }

    const n = await FinanceExpense.destroy({ where: { id: parsed.numericId } });
    if (n === 0) throw new ResourceNotFoundError('Ծախսը չի գտնվել', HttpStatusCodesUtil.NOT_FOUND);
  }
}
