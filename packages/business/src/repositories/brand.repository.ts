import { PrismaClient } from '@prisma/client';
import { Brand, BrandCreateDTO, BrandUpdateDTO } from '@rs-inventory/types';

export class BrandRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findById(id: string): Promise<Brand | null> {
    const record = await this.prisma.brand.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
    return record as unknown as Brand | null;
  }

  public async findByName(companyId: string, name: string): Promise<Brand | null> {
    const record = await this.prisma.brand.findUnique({
      where: {
        companyId_name: {
          companyId,
          name: name.trim(),
        },
      },
    });
    return record as unknown as Brand | null;
  }

  public async findAll(companyId: string, includeInactive: boolean = false): Promise<Brand[]> {
    const records = await this.prisma.brand.findMany({
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
    return records as unknown as Brand[];
  }

  public async create(companyId: string, data: BrandCreateDTO): Promise<Brand> {
    const record = await this.prisma.brand.create({
      data: {
        companyId,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
    return record as unknown as Brand;
  }

  public async update(id: string, data: BrandUpdateDTO): Promise<Brand> {
    const record = await this.prisma.brand.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
    return record as unknown as Brand;
  }

  public async toggleActive(id: string): Promise<Brand> {
    const existing = await this.prisma.brand.findUnique({ where: { id } });
    if (!existing) {
      throw new Error(`Brand with ID ${id} not found.`);
    }
    const updated = await this.prisma.brand.update({
      where: { id },
      data: { isActive: !existing.isActive },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
    return updated as unknown as Brand;
  }

  public async countProducts(brandId: string): Promise<number> {
    return this.prisma.product.count({
      where: { brandId },
    });
  }
}
