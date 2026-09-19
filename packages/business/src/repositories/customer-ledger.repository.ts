import { Prisma, PrismaClient } from '@prisma/client';
import {
  CustomerLedgerEntry,
  CustomerLedgerFilterDTO,
  PaginatedResult,
} from '@rs-inventory/types';

export class CustomerLedgerRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findEntries(
    companyId: string,
    filters: CustomerLedgerFilterDTO,
  ): Promise<PaginatedResult<CustomerLedgerEntry>> {
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.max(1, Math.min(100, filters.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.CustomerLedgerWhereInput = {
      companyId,
      customerId: filters.customerId,
    };

    if (filters.transactionType) {
      where.transactionType = filters.transactionType;
    }

    if (filters.startDate || filters.endDate) {
      where.entryDate = {};
      if (filters.startDate) where.entryDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.entryDate.lte = new Date(filters.endDate);
    }

    const [items, total] = await Promise.all([
      this.prisma.customerLedger.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { entryDate: 'desc' },
      }),
      this.prisma.customerLedger.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize) || 1;
    return {
      items: items as unknown as CustomerLedgerEntry[],
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  public async getLatestRunningBalance(
    customerId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx || this.prisma;
    const latest = await client.customerLedger.findFirst({
      where: { customerId },
      orderBy: { entryDate: 'desc' },
      select: { runningBalance: true },
    });
    return latest ? latest.runningBalance : 0.0;
  }

  public async recordEntry(
    data: Prisma.CustomerLedgerUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<CustomerLedgerEntry> {
    const client = tx || this.prisma;
    const entry = await client.customerLedger.create({ data });
    return entry as unknown as CustomerLedgerEntry;
  }

  public async getStatementEntries(
    companyId: string,
    customerId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<CustomerLedgerEntry[]> {
    const where: Prisma.CustomerLedgerWhereInput = { companyId, customerId };

    if (startDate || endDate) {
      where.entryDate = {};
      if (startDate) where.entryDate.gte = new Date(startDate);
      if (endDate) where.entryDate.lte = new Date(endDate);
    }

    const entries = await this.prisma.customerLedger.findMany({
      where,
      orderBy: { entryDate: 'asc' },
    });

    return entries as unknown as CustomerLedgerEntry[];
  }
}
