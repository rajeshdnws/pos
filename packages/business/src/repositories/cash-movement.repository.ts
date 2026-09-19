import { Prisma, PrismaClient } from '@prisma/client';
import {
  CashbookFilterDTO,
  CashMovement,
  PaginatedResult,
} from '@rs-inventory/types';

export class CashMovementRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async create(
    data: Prisma.CashMovementUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<CashMovement> {
    const client = tx || this.prisma;
    const record = await client.cashMovement.create({
      data,
    });
    return record as unknown as CashMovement;
  }

  public async findBySessionId(
    sessionId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<CashMovement[]> {
    const client = tx || this.prisma;
    const records = await client.cashMovement.findMany({
      where: { cashRegisterSessionId: sessionId },
      orderBy: { movementDate: 'asc' },
    });
    return records as unknown as CashMovement[];
  }

  public async findMany(
    companyId: string,
    filters: CashbookFilterDTO = {},
  ): Promise<PaginatedResult<CashMovement>> {
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.max(1, Math.min(200, filters.pageSize || 50));
    const skip = (page - 1) * pageSize;

    const where: Prisma.CashMovementWhereInput = { companyId };

    if (filters.cashRegisterId) {
      where.cashRegisterId = filters.cashRegisterId;
    }

    if (filters.movementType) {
      where.movementType = filters.movementType;
    }

    if (filters.startDate || filters.endDate) {
      where.movementDate = {};
      if (filters.startDate) {
        where.movementDate.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        where.movementDate.lte = end;
      }
    }

    const [total, items] = await Promise.all([
      this.prisma.cashMovement.count({ where }),
      this.prisma.cashMovement.findMany({
        where,
        orderBy: [{ movementDate: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
      }),
    ]);

    return {
      items: items as unknown as CashMovement[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  public async findAllForPeriod(
    companyId: string,
    cashRegisterId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<CashMovement[]> {
    const where: Prisma.CashMovementWhereInput = { companyId };
    if (cashRegisterId) where.cashRegisterId = cashRegisterId;
    if (startDate || endDate) {
      where.movementDate = {};
      if (startDate) where.movementDate.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.movementDate.lte = end;
      }
    }

    const records = await this.prisma.cashMovement.findMany({
      where,
      orderBy: [{ movementDate: 'asc' }, { createdAt: 'asc' }],
    });
    return records as unknown as CashMovement[];
  }
}
