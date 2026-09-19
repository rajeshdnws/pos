import { Prisma, PrismaClient } from '@prisma/client';
import {
  DayEndClosing,
  DayEndClosingFilterDTO,
  PaginatedResult,
} from '@rs-inventory/types';

export class DayEndClosingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findById(id: string, companyId?: string): Promise<DayEndClosing | null> {
    const where: Prisma.DayEndClosingWhereInput = { id };
    if (companyId) where.companyId = companyId;

    const record = await this.prisma.dayEndClosing.findFirst({
      where,
      include: {
        cashRegister: true,
        cashRegisterSession: true,
      },
    });
    return record as unknown as DayEndClosing | null;
  }

  public async findMany(
    companyId: string,
    filters: DayEndClosingFilterDTO = {},
  ): Promise<PaginatedResult<DayEndClosing>> {
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.max(1, Math.min(100, filters.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.DayEndClosingWhereInput = { companyId };

    if (filters.cashRegisterId) {
      where.cashRegisterId = filters.cashRegisterId;
    }

    if (filters.startDate || filters.endDate) {
      where.businessDate = {};
      if (filters.startDate) {
        where.businessDate.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        where.businessDate.lte = end;
      }
    }

    const [total, items] = await Promise.all([
      this.prisma.dayEndClosing.count({ where }),
      this.prisma.dayEndClosing.findMany({
        where,
        include: {
          cashRegister: true,
          cashRegisterSession: true,
        },
        orderBy: [{ businessDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
      }),
    ]);

    return {
      items: items as unknown as DayEndClosing[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  public async create(
    data: Prisma.DayEndClosingUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<DayEndClosing> {
    const client = tx || this.prisma;
    const record = await client.dayEndClosing.create({
      data,
      include: {
        cashRegister: true,
        cashRegisterSession: true,
      },
    });
    return record as unknown as DayEndClosing;
  }

  public async getLatestClosing(
    companyId: string,
    cashRegisterId?: string,
  ): Promise<DayEndClosing | null> {
    const where: Prisma.DayEndClosingWhereInput = { companyId };
    if (cashRegisterId) where.cashRegisterId = cashRegisterId;

    const record = await this.prisma.dayEndClosing.findFirst({
      where,
      orderBy: { closedAt: 'desc' },
      include: {
        cashRegister: true,
        cashRegisterSession: true,
      },
    });
    return record as unknown as DayEndClosing | null;
  }
}
