import { Package, StudentProfile } from '../models';

export type PackageDto = {
  id: string;
  name: string;
  price: string;
  lessons: number;
  enrolled: number;
  status: string;
  features: string[];
};

export default class PackageService {
  static async list(): Promise<PackageDto[]> {
    const pkgs = await Package.findAll({ order: [['name', 'ASC']] });
    const out: PackageDto[] = [];
    for (const p of pkgs) {
      const enrolled = await StudentProfile.count({ where: { packageId: p.id } });
      out.push({
        id: p.id,
        name: p.name,
        price: p.priceDisplay,
        lessons: p.lessons,
        enrolled,
        status: p.status,
        features: safeJsonArray(p.featuresJson),
      });
    }
    return out;
  }

  static async create(input: { id?: string; name: string; price: string; lessons: number; status?: string; features?: string[] }): Promise<PackageDto> {
    const id = input.id?.trim() || `PKG-${String((await Package.count()) + 1).padStart(3, '0')}`;
    await Package.create({
      id,
      name: input.name,
      priceDisplay: input.price,
      lessons: input.lessons,
      status: input.status ?? 'active',
      featuresJson: JSON.stringify(input.features ?? []),
    });
    return (await this.list()).find((x) => x.id === id)!;
  }

  static async update(
    id: string,
    patch: Partial<{ name: string; price: string; lessons: number; status: string; features: string[] }>,
  ): Promise<PackageDto | null> {
    const row = await Package.findByPk(id);
    if (!row) return null;
    await row.update({
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.price !== undefined ? { priceDisplay: patch.price } : {}),
      ...(patch.lessons !== undefined ? { lessons: patch.lessons } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.features !== undefined ? { featuresJson: JSON.stringify(patch.features) } : {}),
    });
    return (await this.list()).find((x) => x.id === id) ?? null;
  }

  static async remove(id: string): Promise<boolean> {
    const n = await Package.destroy({ where: { id } });
    return n > 0;
  }
}

function safeJsonArray(raw: string): string[] {
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}
