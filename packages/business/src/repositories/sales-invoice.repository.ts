import { Prisma, PrismaClient } from '@prisma/client';
import {
  PaginatedResult,
  SalesDashboardKPIs,
  SalesFilterDTO,
  SalesInvoice,
  SalesSummaryDTO,
} from '@rs-inventory/types';

const INVOICE_INCLUDE = {
  customer: {
    select: {
      id: true,
      name: true,
      customerCode: true,
      phone: true,
      gstin: true,
      state: true,
    },
  },
  location: {
    select: { id: true, name: true, code: true },
  },
  items: {
    include: {
      product: {
        select: { id: true, name: true, sku: true, barcode: true },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  salesPayments: {
    where: { status: 'POSTED' },
    orderBy: { paymentDate: 'asc' as const },
  },
  salesReturns: {
    where: { status: 'POSTED' },
    select: { id: true, returnNumber: true, returnDate: true, grandTotal: true, status: true },
  },
};

export class SalesInvoiceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findMany(
    companyId: string,
    filters: SalesFilterDTO = {},
  ): Promise<PaginatedResult<SalesInvoice>> {
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.max(1, Math.min(100, filters.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.SalesInvoiceWhereInput = { companyId };

    if (filters.status) where.status = filters.status;
    if (filters.paymentStatus) where.paymentStatus = filters.paymentStatus;
    if (filters.invoiceType) where.invoiceType = filters.invoiceType;
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.locationId) where.locationId = filters.locationId;

    if (filters.startDate || filters.endDate) {
      where.invoiceDate = {};
      if (filters.startDate) where.invoiceDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.invoiceDate.lte = new Date(filters.endDate);
    }

    if (filters.search?.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { invoiceNumber: { contains: q } },
        { customerNameSnapshot: { contains: q } },
        { customerPhoneSnapshot: { contains: q } },
        { notes: { contains: q } },
      ];
    }

    const sortBy = filters.sortBy || 'invoiceDate';
    const sortOrder = filters.sortOrder || 'desc';
    const orderBy: Prisma.SalesInvoiceOrderByWithRelationInput =
      sortBy === 'invoiceDate' ? { invoiceDate: sortOrder } :
      sortBy === 'invoiceNumber' ? { invoiceNumber: sortOrder } :
      sortBy === 'grandTotal' ? { grandTotal: sortOrder } :
      sortBy === 'amountPaid' ? { amountPaid: sortOrder } :
      { createdAt: sortOrder };

    const [items, total] = await Promise.all([
      this.prisma.salesInvoice.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          customer: { select: { id: true, name: true, customerCode: true, phone: true } },
          location: { select: { id: true, name: true } },
        },
      }),
      this.prisma.salesInvoice.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize) || 1;
    return {
      items: items as unknown as SalesInvoice[],
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  public async findById(id: string, companyId: string): Promise<SalesInvoice | null> {
    const invoice = await this.prisma.salesInvoice.findUnique({
      where: { id },
      include: INVOICE_INCLUDE,
    });
    if (!invoice || invoice.companyId !== companyId) return null;
    return invoice as unknown as SalesInvoice;
  }

  public async create(
    headerData: Prisma.SalesInvoiceUncheckedCreateInput,
    items: Prisma.SalesInvoiceItemUncheckedCreateWithoutSalesInvoiceInput[],
    tx: Prisma.TransactionClient,
  ): Promise<SalesInvoice> {
    const invoice = await tx.salesInvoice.create({
      data: {
        ...headerData,
        items: { create: items },
      },
      include: INVOICE_INCLUDE,
    });
    return invoice as unknown as SalesInvoice;
  }

  public async update(
    id: string,
    headerData: Prisma.SalesInvoiceUncheckedUpdateInput,
    items?: Prisma.SalesInvoiceItemUncheckedCreateWithoutSalesInvoiceInput[],
    tx?: Prisma.TransactionClient,
  ): Promise<SalesInvoice> {
    const client = tx || this.prisma;

    if (items) {
      // Delete existing items and recreate
      await client.salesInvoiceItem.deleteMany({ where: { salesInvoiceId: id } });
    }

    const invoice = await client.salesInvoice.update({
      where: { id },
      data: {
        ...headerData,
        ...(items ? { items: { create: items } } : {}),
      },
      include: INVOICE_INCLUDE,
    });

    return invoice as unknown as SalesInvoice;
  }

  public async getSummary(companyId: string): Promise<SalesSummaryDTO> {
    const [all, posted, draft, cancelled] = await Promise.all([
      this.prisma.salesInvoice.aggregate({
        where: { companyId },
        _count: { id: true },
        _sum: { grandTotal: true, amountPaid: true },
      }),
      this.prisma.salesInvoice.count({ where: { companyId, status: 'POSTED' } }),
      this.prisma.salesInvoice.count({ where: { companyId, status: 'DRAFT' } }),
      this.prisma.salesInvoice.count({ where: { companyId, status: 'CANCELLED' } }),
    ]);

    const [unpaid, partial, paid] = await Promise.all([
      this.prisma.salesInvoice.count({ where: { companyId, status: 'POSTED', paymentStatus: 'UNPAID' } }),
      this.prisma.salesInvoice.count({ where: { companyId, status: 'POSTED', paymentStatus: 'PARTIALLY_PAID' } }),
      this.prisma.salesInvoice.count({ where: { companyId, status: 'POSTED', paymentStatus: 'PAID' } }),
    ]);

    const totalGrandTotal = all._sum.grandTotal || 0;
    const totalPaidAmount = all._sum.amountPaid || 0;

    return {
      totalSalesCount: all._count.id || 0,
      totalGrandTotal,
      totalPaidAmount,
      totalPendingAmount: Math.max(0, totalGrandTotal - totalPaidAmount),
      draftsCount: draft,
      postedCount: posted,
      cancelledCount: cancelled,
      unpaidCount: unpaid,
      partiallyPaidCount: partial,
      paidCount: paid,
    };
  }

  public async getKPIs(companyId: string): Promise<SalesDashboardKPIs> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayAgg, monthAgg, unpaidCount, partialCount, returnsMonth] = await Promise.all([
      this.prisma.salesInvoice.aggregate({
        where: { companyId, status: 'POSTED', invoiceDate: { gte: todayStart } },
        _count: { id: true },
        _sum: { grandTotal: true },
      }),
      this.prisma.salesInvoice.aggregate({
        where: { companyId, status: 'POSTED', invoiceDate: { gte: monthStart } },
        _count: { id: true },
        _sum: { grandTotal: true },
      }),
      this.prisma.salesInvoice.count({ where: { companyId, status: 'POSTED', paymentStatus: 'UNPAID' } }),
      this.prisma.salesInvoice.count({ where: { companyId, status: 'POSTED', paymentStatus: 'PARTIALLY_PAID' } }),
      this.prisma.salesReturn.aggregate({
        where: { companyId, status: 'POSTED', returnDate: { gte: monthStart } },
        _count: { id: true },
        _sum: { grandTotal: true },
      }),
    ]);

    // Outstanding receivables = sum of (grandTotal - amountPaid) for POSTED unpaid/partial
    const outstandingAgg = await this.prisma.salesInvoice.aggregate({
      where: { companyId, status: 'POSTED', paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID'] } },
      _sum: { grandTotal: true, amountPaid: true },
    });
    const outstanding = Math.max(
      0,
      (outstandingAgg._sum.grandTotal || 0) - (outstandingAgg._sum.amountPaid || 0),
    );

    return {
      salesTodayAmount: todayAgg._sum.grandTotal || 0,
      salesTodayCount: todayAgg._count.id || 0,
      salesThisMonthAmount: monthAgg._sum.grandTotal || 0,
      salesThisMonthCount: monthAgg._count.id || 0,
      outstandingReceivables: outstanding,
      unpaidInvoicesCount: unpaidCount,
      partiallyPaidInvoicesCount: partialCount,
      salesReturnsThisMonthAmount: returnsMonth._sum.grandTotal || 0,
      salesReturnsThisMonthCount: returnsMonth._count.id || 0,
      postedInvoicesCount: unpaidCount + partialCount + (await this.prisma.salesInvoice.count({ where: { companyId, status: 'POSTED', paymentStatus: 'PAID' } })),
    };
  }
}
