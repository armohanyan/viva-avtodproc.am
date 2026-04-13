import { Branch } from '../models';

export default class BranchService {
  static list(): Promise<Branch[]> {
    return Branch.findAll({ order: [['name', 'ASC']] });
  }

  static async create(data: {
    id: string;
    cityId: string;
    name: string;
    mapUrl: string;
    phone?: string | null;
    email?: string | null;
    workHours?: string | null;
  }): Promise<Branch> {
    return Branch.create(data);
  }

  static async update(
    id: string,
    patch: Partial<{
      cityId: string;
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

  static async remove(id: string): Promise<boolean> {
    const n = await Branch.destroy({ where: { id } });
    return n > 0;
  }
}
