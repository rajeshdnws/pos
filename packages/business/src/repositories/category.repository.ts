import { PrismaClient } from '@prisma/client';
import { Category, CategoryCreateDTO, CategoryUpdateDTO } from '@rs-inventory/types';

export class CategoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findById(id: string): Promise<Category | null> {
    const record = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
    return record as unknown as Category | null;
  }

  public async findByName(companyId: string, name: string): Promise<Category | null> {
    const record = await this.prisma.category.findUnique({
      where: {
        companyId_name: {
          companyId,
          name: name.trim(),
        },
      },
    });
    return record as unknown as Category | null;
  }

  public async findAll(companyId: string, includeInactive: boolean = false): Promise<Category[]> {
    const records = await this.prisma.category.findMany({
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
    return records as unknown as Category[];
  }

  public async create(companyId: string, data: CategoryCreateDTO): Promise<Category> {
    const record = await this.prisma.category.create({
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
    return record as unknown as Category;
  }

  public async update(id: string, data: CategoryUpdateDTO): Promise<Category> {
    const record = await this.prisma.category.update({
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
    return record as unknown as Category;
  }

  public async toggleActive(id: string): Promise<Category> {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) {
      throw new Error(`Category with ID ${id} not found.`);
    }
    const updated = await this.prisma.category.update({
      where: { id },
      data: { isActive: !existing.isActive },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
    return updated as unknown as Category;
  }

  public async countProducts(categoryId: string): Promise<number> {
    return this.prisma.product.count({
      where: { categoryId },
    });
  }
}
