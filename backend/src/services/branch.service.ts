import { Branch } from '../models';

export default class BranchService {
  static list(): Promise<Branch[]> {
    return Branch.findAll({ order: [['name', 'ASC']] });
  }

  static async create(data: {
    cityId: number;
    name: string;
    mapUrl: string;
    phone?: string | null;
    email?: string | null;
    workHours?: string | null;
  }): Promise<Branch> {
    return Branch.create(data);
  }

  static async update(
    id: number,
    patch: Partial<{
      cityId: number;
      name: string;
      mapUrl: string;
      phone: string | null;
      email: string | null;
      workHours: string | null;
    }>,
  ): Promise<Branch | null> {
    const row = await Branch.findByPk(id);
    if (!row) return null;
    await row.update(patch);
    return row;
  }

  static async remove(id: number): Promise<boolean> {
    const n = await Branch.destroy({ where: { id } });
    return n > 0;
  }
}
