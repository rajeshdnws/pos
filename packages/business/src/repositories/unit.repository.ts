import { PrismaClient } from '@prisma/client';
import { Unit, UnitCreateDTO, UnitUpdateDTO } from '@rs-inventory/types';

export const STANDARD_UNITS: Array<{ name: string; shortCode: string; allowDecimals: boolean }> = [
  { name: 'Piece', shortCode: 'PCS', allowDecimals: false },
  { name: 'Kilogram', shortCode: 'KG', allowDecimals: true },
  { name: 'Gram', shortCode: 'GM', allowDecimals: true },
  { name: 'Liter', shortCode: 'LTR', allowDecimals: true },
  { name: 'Milliliter', shortCode: 'ML', allowDecimals: true },
  { name: 'Meter', shortCode: 'MTR', allowDecimals: true },
  { name: 'Box', shortCode: 'BOX', allowDecimals: false },
  { name: 'Dozen', shortCode: 'DOZ', allowDecimals: false },
  { name: 'Packet', shortCode: 'PKT', allowDecimals: false },
  { name: 'Bottle', shortCode: 'BTL', allowDecimals: false },
];

export class UnitRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findById(id: string): Promise<Unit | null> {
    const record = await this.prisma.unit.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
    return record as unknown as Unit | null;
  }

  public async findByShortCode(companyId: string, shortCode: string): Promise<Unit | null> {
    const record = await this.prisma.unit.findUnique({
      where: {
        companyId_shortCode: {
          companyId,
          shortCode: shortCode.trim().toUpperCase(),
        },
      },
    });
    return record as unknown as Unit | null;
  }

  public async findAll(companyId: string, includeInactive: boolean = false): Promise<Unit[]> {
    const records = await this.prisma.unit.findMany({
      where: {
        companyId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    return records as unknown as Unit[];
  }

  public async create(companyId: string, data: UnitCreateDTO): Promise<Unit> {
    const record = await this.prisma.unit.create({
      data: {
        companyId,
        name: data.name.trim(),
        shortCode: data.shortCode.trim().toUpperCase(),
        allowDecimals: Boolean(data.allowDecimals),
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
    return record as unknown as Unit;
  }

  public async update(id: string, data: UnitUpdateDTO): Promise<Unit> {
    const record = await this.prisma.unit.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.shortCode !== undefined ? { shortCode: data.shortCode.trim().toUpperCase() } : {}),
        ...(data.allowDecimals !== undefined ? { allowDecimals: Boolean(data.allowDecimals) } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
    return record as unknown as Unit;
  }

  public async toggleActive(id: string): Promise<Unit> {
    const existing = await this.prisma.unit.findUnique({ where: { id } });
    if (!existing) {
      throw new Error(`Unit with ID ${id} not found.`);
    }
    const updated = await this.prisma.unit.update({
      where: { id },
      data: { isActive: !existing.isActive },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
    return updated as unknown as Unit;
  }

  public async seedDefaultUnits(companyId: string): Promise<Unit[]> {
    const existing = await this.prisma.unit.findMany({
      where: { companyId },
    });
    const existingCodes = new Set(existing.map((u) => u.shortCode.toUpperCase()));

    for (const unit of STANDARD_UNITS) {
      if (!existingCodes.has(unit.shortCode)) {
        await this.prisma.unit.create({
          data: {
            companyId,
            name: unit.name,
            shortCode: unit.shortCode,
            allowDecimals: unit.allowDecimals,
            isActive: true,
          },
        });
      }
    }

    return this.findAll(companyId, true);
  }

  public async countProducts(unitId: string): Promise<number> {
    return this.prisma.product.count({
      where: { unitId },
    });
  }
}
