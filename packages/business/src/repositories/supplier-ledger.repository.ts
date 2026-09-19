import { Prisma, PrismaClient } from '@prisma/client';
import { PaginatedResult, SupplierLedgerEntry, SupplierLedgerFilterDTO } from '@rs-inventory/types';

export class SupplierLedgerRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findEntries(
    companyId: string,
    filters: SupplierLedgerFilterDTO,
  ): Promise<PaginatedResult<SupplierLedgerEntry>> {
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.max(1, Math.min(100, filters.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.SupplierLedgerWhereInput = {
      companyId,
      supplierId: filters.supplierId,
    };

    if (filters.transactionType) {
      where.transactionType = filters.transactionType;
    }

    if (filters.startDate || filters.endDate) {
      where.entryDate = {};
      if (filters.startDate) {
        where.entryDate.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.entryDate.lte = new Date(filters.endDate);
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.supplierLedger.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { entryDate: 'desc' },
      }),
      this.prisma.supplierLedger.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize) || 1;

    return {
      items: items as unknown as SupplierLedgerEntry[],
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  public async getLatestRunningBalance(
    supplierId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx || this.prisma;
    const latest = await client.supplierLedger.findFirst({
      where: { supplierId },
      orderBy: { entryDate: 'desc' },
      select: { runningBalance: true },
    });

    return latest ? latest.runningBalance : 0.0;
  }

  public async recordEntry(
    data: Prisma.SupplierLedgerUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<SupplierLedgerEntry> {
    const client = tx || this.prisma;
    const entry = await client.supplierLedger.create({
      data,
    });
    return entry as unknown as SupplierLedgerEntry;
  }

  public async getStatementEntries(
    companyId: string,
    supplierId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<SupplierLedgerEntry[]> {
    const where: Prisma.SupplierLedgerWhereInput = {
      companyId,
      supplierId,
    };

    if (startDate || endDate) {
      where.entryDate = {};
      if (startDate) where.entryDate.gte = new Date(startDate);
      if (endDate) where.entryDate.lte = new Date(endDate);
    }

    const entries = await this.prisma.supplierLedger.findMany({
      where,
      orderBy: { entryDate: 'asc' },
    });

    return entries as unknown as SupplierLedgerEntry[];
  }
}
