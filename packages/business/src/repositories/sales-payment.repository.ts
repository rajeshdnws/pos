import { Prisma, PrismaClient } from '@prisma/client';
import { PaginatedResult, SalesPayment, SalesPaymentFilterDTO } from '@rs-inventory/types';

export class SalesPaymentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findMany(
    companyId: string,
    filters: SalesPaymentFilterDTO = {},
  ): Promise<PaginatedResult<SalesPayment>> {
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.max(1, Math.min(100, filters.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.SalesPaymentWhereInput = { companyId };

    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.salesInvoiceId) where.salesInvoiceId = filters.salesInvoiceId;
    if (filters.paymentMode) where.paymentMode = filters.paymentMode;
    if (filters.status) where.status = filters.status;

    if (filters.startDate || filters.endDate) {
      where.paymentDate = {};
      if (filters.startDate) where.paymentDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.paymentDate.lte = new Date(filters.endDate);
    }

    const [items, total] = await Promise.all([
      this.prisma.salesPayment.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { paymentDate: 'desc' },
        include: {
          customer: { select: { id: true, name: true, customerCode: true } },
          salesInvoice: { select: { id: true, invoiceNumber: true, grandTotal: true } },
        },
      }),
      this.prisma.salesPayment.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize) || 1;
    return {
      items: items as unknown as SalesPayment[],
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  public async findById(id: string, companyId: string): Promise<SalesPayment | null> {
    const payment = await this.prisma.salesPayment.findUnique({
      where: { id },
      include: {
        customer: true,
        salesInvoice: { select: { id: true, invoiceNumber: true } },
      },
    });
    if (!payment || payment.companyId !== companyId) return null;
    return payment as unknown as SalesPayment;
  }

  public async create(
    data: Prisma.SalesPaymentUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<SalesPayment> {
    const client = tx || this.prisma;
    const payment = await client.salesPayment.create({ data });
    return payment as unknown as SalesPayment;
  }

  public async getAmountPaidForInvoice(
    salesInvoiceId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx || this.prisma;
    const agg = await client.salesPayment.aggregate({
      where: { salesInvoiceId, status: 'POSTED' },
      _sum: { amount: true },
    });
    return agg._sum.amount || 0;
  }
}
