import { Op } from 'sequelize';
import { CarExpense, FleetCar, FleetCarInstructor, User } from '../models';

export type FleetCarDto = {
  id: number;
  plate: string;
  vin?: string;
  make: string;
  model: string;
  year?: number;
  transmission?: 'manual' | 'automatic';
  notes?: string;
  assignedInstructorEmails?: string[];
};

export type CarExpenseDto = {
  id: number;
  carId: number;
  amount: number;
  date: string;
  purpose: string;
  note?: string;
};

async function carToDto(car: FleetCar): Promise<FleetCarDto> {
  const links = await FleetCarInstructor.findAll({
    where: { carId: car.id },
    include: [{ model: User, as: 'user', required: true, attributes: ['email'] }],
  });
  const emails = links
    .map((l) => {
      const row = l as FleetCarInstructor & { user?: User };
      return row.user?.email ?? '';
    })
    .filter(Boolean);
  return {
    id: car.id,
    plate: car.plate,
    vin: car.vin ?? undefined,
    make: car.make,
    model: car.model,
    year: car.year ?? undefined,
    transmission: car.transmission ?? undefined,
    notes: car.notes ?? undefined,
    assignedInstructorEmails: emails.length ? emails : undefined,
  };
}

export default class FleetService {
  static async listCars(): Promise<FleetCarDto[]> {
    const cars = await FleetCar.findAll({ order: [['plate', 'ASC']] });
    return Promise.all(cars.map((c) => carToDto(c)));
  }

  static async listExpenses(): Promise<CarExpenseDto[]> {
    const rows = await CarExpense.findAll({ order: [['date', 'DESC']] });
    return rows.map((e) => ({
      id: e.id,
      carId: e.carId,
      amount: e.amount,
      date: typeof e.date === 'string' ? e.date : String(e.date).slice(0, 10),
      purpose: e.purpose,
      note: e.note ?? undefined,
    }));
  }

  static async createCar(input: Omit<FleetCarDto, 'id'>): Promise<FleetCarDto> {
    const row = await FleetCar.create({
      plate: input.plate,
      vin: input.vin ?? null,
      make: input.make,
      model: input.model,
      year: input.year ?? null,
      transmission: input.transmission ?? null,
      notes: input.notes ?? null,
    });
    await this.setCarInstructors(row.id, input.assignedInstructorEmails ?? []);
    return (await this.listCars()).find((c) => c.id === row.id)!;
  }

  static async updateCar(id: number, patch: Partial<Omit<FleetCarDto, 'id'>>): Promise<FleetCarDto | null> {
    const row = await FleetCar.findByPk(id);
    if (!row) return null;
    await row.update({
      ...(patch.plate !== undefined ? { plate: patch.plate } : {}),
      ...(patch.vin !== undefined ? { vin: patch.vin || null } : {}),
      ...(patch.make !== undefined ? { make: patch.make } : {}),
      ...(patch.model !== undefined ? { model: patch.model } : {}),
      ...(patch.year !== undefined ? { year: patch.year ?? null } : {}),
      ...(patch.transmission !== undefined ? { transmission: patch.transmission ?? null } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes ?? null } : {}),
    });
    if (patch.assignedInstructorEmails !== undefined) {
      await this.setCarInstructors(id, patch.assignedInstructorEmails);
    }
    return (await this.listCars()).find((c) => c.id === id) ?? null;
  }

  static async removeCar(id: number): Promise<boolean> {
    await CarExpense.destroy({ where: { carId: id } });
    await FleetCarInstructor.destroy({ where: { carId: id } });
    const n = await FleetCar.destroy({ where: { id } });
    return n > 0;
  }

  static async addExpense(input: Omit<CarExpenseDto, 'id'>): Promise<CarExpenseDto> {
    const row = await CarExpense.create({
      carId: input.carId,
      amount: input.amount,
      date: input.date,
      purpose: input.purpose,
      note: input.note ?? null,
    });
    return {
      id: row.id,
      carId: row.carId,
      amount: row.amount,
      date: typeof row.date === 'string' ? row.date : String(row.date).slice(0, 10),
      purpose: row.purpose,
      note: row.note ?? undefined,
    };
  }

  static async updateExpense(
    id: number,
    patch: Partial<{
      carId: number;
      amount: number;
      date: string;
      purpose: string;
      note: string | null;
    }>,
  ): Promise<CarExpenseDto | null> {
    const row = await CarExpense.findByPk(id);
    if (!row) return null;
    await row.update(patch);
    const list = await this.listExpenses();
    return list.find((e) => e.id === id) ?? null;
  }

  static async removeExpense(id: number): Promise<boolean> {
    const n = await CarExpense.destroy({ where: { id } });
    return n > 0;
  }

  private static async setCarInstructors(carId: number, emails: string[]): Promise<void> {
    await FleetCarInstructor.destroy({ where: { carId } });
    for (const email of emails) {
      const u = await User.findOne({
        where: { email: email.trim().toLowerCase(), accountType: 'instructor' },
      });
      if (u) {
        await FleetCarInstructor.create({ carId, instructorUserId: u.id });
      }
    }
  }

  /** All fleet car ids linked to an instructor (for API DTOs). */
  static async listCarIdsForInstructor(instructorUserId: number): Promise<number[]> {
    const rows = await FleetCarInstructor.findAll({
      where: { instructorUserId },
      attributes: ['carId'],
      order: [['carId', 'ASC']],
    });
    return rows.map((r) => r.carId);
  }

  static async listCarIdsByInstructorIds(instructorUserIds: readonly number[]): Promise<Map<number, number[]>> {
    const out = new Map<number, number[]>();
    if (instructorUserIds.length === 0) return out;
    const rows = await FleetCarInstructor.findAll({
      where: { instructorUserId: { [Op.in]: [...instructorUserIds] } },
      attributes: ['instructorUserId', 'carId'],
      order: [
        ['instructorUserId', 'ASC'],
        ['carId', 'ASC'],
      ],
    });
    for (const r of rows) {
      const list = out.get(r.instructorUserId) ?? [];
      list.push(r.carId);
      out.set(r.instructorUserId, list);
    }
    return out;
  }

  /** Replace instructor ↔ car links; invalid car ids are skipped. */
  static async syncInstructorCars(instructorUserId: number, carIds: readonly number[]): Promise<void> {
    const wantUniq = [...new Set(carIds)].filter((n) => Number.isFinite(n) && n > 0);
    const existing = await FleetCarInstructor.findAll({ where: { instructorUserId } });
    const current = new Set(existing.map((e) => e.carId));
    const want = new Set<number>();
    if (wantUniq.length > 0) {
      const cars = await FleetCar.findAll({ where: { id: { [Op.in]: wantUniq } }, attributes: ['id'] });
      for (const c of cars) want.add(c.id);
    }
    for (const carId of current) {
      if (!want.has(carId)) {
        await FleetCarInstructor.destroy({ where: { carId, instructorUserId } });
      }
    }
    for (const carId of want) {
      if (!current.has(carId)) {
        await FleetCarInstructor.create({ carId, instructorUserId });
      }
    }
  }

  /** Strings for instructor API/cards — derived only from fleet rows (no duplicated profile columns). */
  static derivePublicCarFields(cars: FleetCar[]): { car: string; transmission: string } {
    const sorted = [...cars].sort((a, b) => a.plate.localeCompare(b.plate));
    if (sorted.length === 0) return { car: '—', transmission: '—' };
    const labels = sorted.map((c) => {
      const mm = [c.make, c.model].filter(Boolean).join(' ').trim();
      return mm || c.plate;
    });
    const car = labels.join(', ');
    const transVals = sorted
      .map((c) => c.transmission)
      .filter((v): v is 'manual' | 'automatic' => v === 'manual' || v === 'automatic');
    const uniq = [...new Set(transVals)];
    const transmission =
      uniq.length === 0
        ? '—'
        : uniq.length === 1
          ? uniq[0] === 'manual'
            ? 'Manual'
            : 'Automatic'
          : 'Mixed';
    return { car, transmission };
  }
}
