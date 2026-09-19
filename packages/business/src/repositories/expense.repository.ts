import { Prisma, PrismaClient } from '@prisma/client';
import {
  Expense,
  ExpenseFilterDTO,
  PaginatedResult,
} from '@rs-inventory/types';

export class ExpenseRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findById(id: string, companyId?: string): Promise<Expense | null> {
    const where: Prisma.ExpenseWhereInput = { id };
    if (companyId) where.companyId = companyId;

    const record = await this.prisma.expense.findFirst({
      where,
      include: {
        category: true,
        cashRegisterSession: true,
      },
    });
    return record as unknown as Expense | null;
  }

  public async findMany(
    companyId: string,
    filters: ExpenseFilterDTO = {},
  ): Promise<PaginatedResult<Expense>> {
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.max(1, Math.min(100, filters.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.ExpenseWhereInput = { companyId };

    if (filters.search?.trim()) {
      const search = filters.search.trim();
      where.OR = [
        { expenseNumber: { contains: search } },
        { description: { contains: search } },
        { payee: { contains: search } },
        { referenceNumber: { contains: search } },
        { receiptReference: { contains: search } },
      ];
    }

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.paymentMethod) {
      where.paymentMethod = filters.paymentMethod;
    }

    if (filters.startDate || filters.endDate) {
      where.expenseDate = {};
      if (filters.startDate) {
        where.expenseDate.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        where.expenseDate.lte = end;
      }
    }

    const [total, items] = await Promise.all([
      this.prisma.expense.count({ where }),
      this.prisma.expense.findMany({
        where,
        include: {
          category: true,
          cashRegisterSession: true,
        },
        orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
      }),
    ]);

    return {
      items: items as unknown as Expense[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  public async create(
    data: Prisma.ExpenseUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Expense> {
    const client = tx || this.prisma;
    const record = await client.expense.create({
      data,
      include: {
        category: true,
        cashRegisterSession: true,
      },
    });
    return record as unknown as Expense;
  }

  public async update(
    id: string,
    data: Prisma.ExpenseUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Expense> {
    const client = tx || this.prisma;
    const record = await client.expense.update({
      where: { id },
      data,
      include: {
        category: true,
        cashRegisterSession: true,
      },
    });
    return record as unknown as Expense;
  }
}
