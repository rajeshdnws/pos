import { Prisma, PrismaClient } from '@prisma/client';
import {
  ExpenseCategory,
  ExpenseCategoryCreateDTO,
  ExpenseCategoryUpdateDTO,
} from '@rs-inventory/types';

export class ExpenseCategoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findById(id: string): Promise<ExpenseCategory | null> {
    const record = await this.prisma.expenseCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { expenses: true },
        },
      },
    });
    return record as unknown as ExpenseCategory | null;
  }

  public async findByName(companyId: string, name: string): Promise<ExpenseCategory | null> {
    const trimmed = name.trim().toLowerCase();
    const records = await this.prisma.expenseCategory.findMany({
      where: { companyId },
    });
    const found = records.find((r) => r.name.trim().toLowerCase() === trimmed);
    return (found as unknown as ExpenseCategory) || null;
  }

  public async findAll(companyId: string, includeInactive: boolean = false): Promise<ExpenseCategory[]> {
    const records = await this.prisma.expenseCategory.findMany({
      where: {
        companyId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        _count: {
          select: { expenses: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    return records as unknown as ExpenseCategory[];
  }

  public async create(
    companyId: string,
    data: ExpenseCategoryCreateDTO,
    userId?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<ExpenseCategory> {
    const client = tx || this.prisma;
    const record = await client.expenseCategory.create({
      data: {
        companyId,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        isActive: true,
        createdBy: userId || null,
      },
    });
    return record as unknown as ExpenseCategory;
  }

  public async update(
    id: string,
    data: ExpenseCategoryUpdateDTO,
    tx?: Prisma.TransactionClient,
  ): Promise<ExpenseCategory> {
    const client = tx || this.prisma;
    const updateData: Prisma.ExpenseCategoryUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.description !== undefined) updateData.description = data.description?.trim() || null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const record = await client.expenseCategory.update({
      where: { id },
      data: updateData,
    });
    return record as unknown as ExpenseCategory;
  }

  public async delete(id: string): Promise<boolean> {
    await this.prisma.expenseCategory.delete({
      where: { id },
    });
    return true;
  }

  public async hasExpenses(id: string): Promise<boolean> {
    const count = await this.prisma.expense.count({
      where: { categoryId: id },
    });
    return count > 0;
  }
}
