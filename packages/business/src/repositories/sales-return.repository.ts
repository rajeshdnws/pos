import { Prisma, PrismaClient } from '@prisma/client';
import { PaginatedResult, SalesReturn, SalesReturnFilterDTO } from '@rs-inventory/types';

const RETURN_INCLUDE = {
  customer: { select: { id: true, name: true, customerCode: true, phone: true } },
  location: { select: { id: true, name: true } },
  originalSalesInvoice: { select: { id: true, invoiceNumber: true, invoiceDate: true, grandTotal: true } },
  items: {
    include: {
      product: { select: { id: true, name: true, sku: true, barcode: true } },
    },
  },
};

export class SalesReturnRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findMany(
    companyId: string,
    filters: SalesReturnFilterDTO = {},
  ): Promise<PaginatedResult<SalesReturn>> {
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.max(1, Math.min(100, filters.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.SalesReturnWhereInput = { companyId };

    if (filters.status) where.status = filters.status;
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.originalSalesInvoiceId) {
      where.originalSalesInvoiceId = filters.originalSalesInvoiceId;
    }

    if (filters.startDate || filters.endDate) {
      where.returnDate = {};
      if (filters.startDate) where.returnDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.returnDate.lte = new Date(filters.endDate);
    }

    if (filters.search?.trim()) {
      const q = filters.search.trim();
      where.OR = [{ returnNumber: { contains: q } }, { reason: { contains: q } }];
    }

    const [items, total] = await Promise.all([
      this.prisma.salesReturn.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { returnDate: 'desc' },
        include: {
          customer: { select: { id: true, name: true, customerCode: true } },
          originalSalesInvoice: { select: { id: true, invoiceNumber: true } },
        },
      }),
      this.prisma.salesReturn.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize) || 1;
    return {
      items: items as unknown as SalesReturn[],
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  public async findById(id: string, companyId: string): Promise<SalesReturn | null> {
    const ret = await this.prisma.salesReturn.findUnique({
      where: { id },
      include: RETURN_INCLUDE,
    });
    if (!ret || ret.companyId !== companyId) return null;
    return ret as unknown as SalesReturn;
  }

  public async getTotalReturnedQuantityForInvoiceItem(
    originalSalesInvoiceItemId: string,
    excludeReturnId?: string,
  ): Promise<number> {
    const where: Prisma.SalesReturnItemWhereInput = {
      originalSalesInvoiceItemId,
      salesReturn: { status: 'POSTED' },
    };
    if (excludeReturnId) {
      where.salesReturnId = { not: excludeReturnId };
    }
    const agg = await this.prisma.salesReturnItem.aggregate({
      where,
      _sum: { quantity: true },
    });
    return agg._sum.quantity || 0;
  }

  public async create(
    headerData: Prisma.SalesReturnUncheckedCreateInput,
    items: Prisma.SalesReturnItemUncheckedCreateWithoutSalesReturnInput[],
    tx: Prisma.TransactionClient,
  ): Promise<SalesReturn> {
    const ret = await tx.salesReturn.create({
      data: {
        ...headerData,
        items: { create: items },
      },
      include: RETURN_INCLUDE,
    });
    return ret as unknown as SalesReturn;
  }
}
