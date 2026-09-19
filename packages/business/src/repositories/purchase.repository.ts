import { Prisma, PrismaClient } from '@prisma/client';
import {
  PaginatedResult,
  Purchase,
  PurchaseDashboardKPIs,
  PurchaseFilterDTO,
  PurchaseSummaryDTO,
} from '@rs-inventory/types';

export class PurchaseRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findById(id: string, companyId?: string): Promise<Purchase | null> {
    const where: Prisma.PurchaseWhereInput = { id };
    if (companyId) {
      where.companyId = companyId;
    }

    const record = await this.prisma.purchase.findFirst({
      where,
      include: {
        supplier: true,
        location: true,
        items: {
          include: {
            product: {
              include: { unit: true, category: true, brand: true },
            },
          },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
        purchaseReturns: {
          include: {
            items: true,
          },
          orderBy: { returnDate: 'desc' },
        },
      },
    });

    return record as unknown as Purchase | null;
  }

  public async findByNumber(companyId: string, purchaseNumber: string): Promise<Purchase | null> {
    const record = await this.prisma.purchase.findFirst({
      where: { companyId, purchaseNumber },
    });
    return record as unknown as Purchase | null;
  }

  public async findMany(
    companyId: string,
    filters?: PurchaseFilterDTO,
  ): Promise<PaginatedResult<Purchase>> {
    const page = Math.max(1, filters?.page || 1);
    const pageSize = Math.max(1, Math.min(100, filters?.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.PurchaseWhereInput = { companyId };

    if (filters?.supplierId) {
      where.supplierId = filters.supplierId;
    }

    if (filters?.locationId) {
      where.locationId = filters.locationId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.paymentStatus) {
      where.paymentStatus = filters.paymentStatus;
    }

    if (filters?.startDate || filters?.endDate) {
      where.purchaseDate = {};
      if (filters.startDate) where.purchaseDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.purchaseDate.lte = new Date(filters.endDate);
    }

    if (filters?.search && filters.search.trim().length > 0) {
      const q = filters.search.trim();
      where.OR = [
        { purchaseNumber: { contains: q } },
        { supplierInvoiceNumber: { contains: q } },
        { supplier: { name: { contains: q } } },
        { notes: { contains: q } },
      ];
    }

    const orderBy: Prisma.PurchaseOrderByWithRelationInput = {};
    const sortBy = filters?.sortBy || 'purchaseDate';
    const sortOrder = filters?.sortOrder || 'desc';

    if (sortBy === 'purchaseNumber') orderBy.purchaseNumber = sortOrder;
    else if (sortBy === 'grandTotal') orderBy.grandTotal = sortOrder;
    else if (sortBy === 'amountPaid') orderBy.amountPaid = sortOrder;
    else if (sortBy === 'createdAt') orderBy.createdAt = sortOrder;
    else orderBy.purchaseDate = sortOrder;

    const [items, total] = await Promise.all([
      this.prisma.purchase.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          supplier: {
            select: {
              id: true,
              name: true,
              supplierCode: true,
              phone: true,
              gstin: true,
              city: true,
            },
          },
          location: {
            select: { id: true, name: true, code: true },
          },
          items: {
            select: { id: true, quantity: true, lineTotal: true, productNameSnapshot: true },
          },
        },
      }),
      this.prisma.purchase.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize) || 1;

    return {
      items: items as unknown as Purchase[],
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  public async create(
    data: Prisma.PurchaseUncheckedCreateInput,
    items: Prisma.PurchaseItemUncheckedCreateWithoutPurchaseInput[],
    tx?: Prisma.TransactionClient,
  ): Promise<Purchase> {
    const client = tx || this.prisma;
    const record = await client.purchase.create({
      data: {
        ...data,
        items: {
          create: items,
        },
      },
      include: {
        supplier: true,
        location: true,
        items: true,
      },
    });
    return record as unknown as Purchase;
  }

  public async update(
    id: string,
    data: Prisma.PurchaseUncheckedUpdateInput,
    items?: Prisma.PurchaseItemUncheckedCreateWithoutPurchaseInput[],
    tx?: Prisma.TransactionClient,
  ): Promise<Purchase> {
    const client = tx || this.prisma;

    if (items) {
      // Delete old items and recreate
      await client.purchaseItem.deleteMany({ where: { purchaseId: id } });
      const record = await client.purchase.update({
        where: { id },
        data: {
          ...data,
          items: {
            create: items,
          },
        },
        include: {
          supplier: true,
          location: true,
          items: true,
        },
      });
      return record as unknown as Purchase;
    }

    const record = await client.purchase.update({
      where: { id },
      data,
      include: {
        supplier: true,
        location: true,
        items: true,
      },
    });
    return record as unknown as Purchase;
  }

  public async getSummary(companyId: string): Promise<PurchaseSummaryDTO> {
    const purchases = await this.prisma.purchase.findMany({
      where: { companyId },
      select: {
        status: true,
        paymentStatus: true,
        grandTotal: true,
        amountPaid: true,
      },
    });

    let totalGrandTotal = 0;
    let totalPaidAmount = 0;
    let draftsCount = 0;
    let postedCount = 0;
    let cancelledCount = 0;
    let unpaidCount = 0;
    let partiallyPaidCount = 0;
    let paidCount = 0;

    for (const p of purchases) {
      if (p.status === 'POSTED') {
        totalGrandTotal += p.grandTotal;
        totalPaidAmount += p.amountPaid;
        postedCount++;

        if (p.paymentStatus === 'UNPAID') unpaidCount++;
        else if (p.paymentStatus === 'PARTIALLY_PAID') partiallyPaidCount++;
        else if (p.paymentStatus === 'PAID') paidCount++;
      } else if (p.status === 'DRAFT') {
        draftsCount++;
      } else if (p.status === 'CANCELLED') {
        cancelledCount++;
      }
    }

    const totalPurchasesCount = purchases.length;
    const totalPendingAmount = Math.max(0, totalGrandTotal - totalPaidAmount);

    return {
      totalPurchasesCount,
      totalGrandTotal: Math.round((totalGrandTotal + Number.EPSILON) * 100) / 100,
      totalPaidAmount: Math.round((totalPaidAmount + Number.EPSILON) * 100) / 100,
      totalPendingAmount: Math.round((totalPendingAmount + Number.EPSILON) * 100) / 100,
      draftsCount,
      postedCount,
      cancelledCount,
      unpaidCount,
      partiallyPaidCount,
      paidCount,
    };
  }

  public async getKPIs(companyId: string): Promise<PurchaseDashboardKPIs> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);

    const [todayPurchases, monthPurchases, suppliersWithBalance, unpaid, partial, monthReturns] =
      await Promise.all([
        this.prisma.purchase.findMany({
          where: {
            companyId,
            status: 'POSTED',
            purchaseDate: { gte: startOfToday },
          },
          select: { grandTotal: true },
        }),
        this.prisma.purchase.findMany({
          where: {
            companyId,
            status: 'POSTED',
            purchaseDate: { gte: startOfMonth },
          },
          select: { grandTotal: true },
        }),
        this.prisma.supplier.findMany({
          where: {
            companyId,
            currentBalance: { gt: 0 },
          },
          select: { currentBalance: true },
        }),
        this.prisma.purchase.count({
          where: { companyId, status: 'POSTED', paymentStatus: 'UNPAID' },
        }),
        this.prisma.purchase.count({
          where: { companyId, status: 'POSTED', paymentStatus: 'PARTIALLY_PAID' },
        }),
        this.prisma.purchaseReturn.findMany({
          where: {
            companyId,
            status: 'POSTED',
            returnDate: { gte: startOfMonth },
          },
          select: { grandTotal: true },
        }),
      ]);

    const purchasesTodayAmount = todayPurchases.reduce((sum, p) => sum + p.grandTotal, 0);
    const purchasesThisMonthAmount = monthPurchases.reduce((sum, p) => sum + p.grandTotal, 0);
    const outstandingSupplierPayables = suppliersWithBalance.reduce(
      (sum, s) => sum + s.currentBalance,
      0,
    );
    const purchaseReturnsThisMonthAmount = monthReturns.reduce((sum, r) => sum + r.grandTotal, 0);

    return {
      purchasesTodayAmount: Math.round((purchasesTodayAmount + Number.EPSILON) * 100) / 100,
      purchasesTodayCount: todayPurchases.length,
      purchasesThisMonthAmount: Math.round((purchasesThisMonthAmount + Number.EPSILON) * 100) / 100,
      purchasesThisMonthCount: monthPurchases.length,
      outstandingSupplierPayables:
        Math.round((outstandingSupplierPayables + Number.EPSILON) * 100) / 100,
      unpaidPurchasesCount: unpaid,
      partiallyPaidPurchasesCount: partial,
      purchaseReturnsThisMonthAmount:
        Math.round((purchaseReturnsThisMonthAmount + Number.EPSILON) * 100) / 100,
      purchaseReturnsThisMonthCount: monthReturns.length,
    };
  }
}
