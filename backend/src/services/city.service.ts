import { City } from '../models';

export default class CityService {
  static list(): Promise<City[]> {
    return City.findAll({ order: [['name', 'ASC']] });
  }

  static async create(data: { name: string }): Promise<City> {
    return City.create(data);
  }

  static async update(id: number, patch: { name?: string }): Promise<City | null> {
    const row = await City.findByPk(id);
    if (!row) return null;
    await row.update(patch);
    return row;
  }

  static async remove(id: number): Promise<boolean> {
    const n = await City.destroy({ where: { id } });
    return n > 0;
  }
}
