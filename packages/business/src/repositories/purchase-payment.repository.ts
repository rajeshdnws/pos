import { Prisma, PrismaClient } from '@prisma/client';
import { PaginatedResult, PurchasePayment, PurchasePaymentFilterDTO } from '@rs-inventory/types';

export class PurchasePaymentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findById(id: string, companyId?: string): Promise<PurchasePayment | null> {
    const where: Prisma.PaymentMadeWhereInput = { id };
    if (companyId) where.companyId = companyId;

    const record = await this.prisma.paymentMade.findFirst({
      where,
      include: {
        supplier: true,
        purchase: true,
      },
    });

    return record as unknown as PurchasePayment | null;
  }

  public async findMany(
    companyId: string,
    filters?: PurchasePaymentFilterDTO,
  ): Promise<PaginatedResult<PurchasePayment>> {
    const page = Math.max(1, filters?.page || 1);
    const pageSize = Math.max(1, Math.min(100, filters?.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.PaymentMadeWhereInput = { companyId };

    if (filters?.supplierId) where.supplierId = filters.supplierId;
    if (filters?.purchaseId) where.purchaseId = filters.purchaseId;
    if (filters?.status) where.status = filters.status;
    if (filters?.paymentMode) where.paymentMode = filters.paymentMode;

    if (filters?.startDate || filters?.endDate) {
      where.paymentDate = {};
      if (filters.startDate) where.paymentDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.paymentDate.lte = new Date(filters.endDate);
    }

    const [items, total] = await Promise.all([
      this.prisma.paymentMade.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { paymentDate: 'desc' },
        include: {
          supplier: {
            select: { id: true, name: true, supplierCode: true },
          },
          purchase: {
            select: { id: true, purchaseNumber: true, grandTotal: true, amountPaid: true },
          },
        },
      }),
      this.prisma.paymentMade.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize) || 1;

    return {
      items: items as unknown as PurchasePayment[],
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  public async create(
    data: Prisma.PaymentMadeUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<PurchasePayment> {
    const client = tx || this.prisma;
    const record = await client.paymentMade.create({
      data,
    });
    return record as unknown as PurchasePayment;
  }

  public async update(
    id: string,
    data: Prisma.PaymentMadeUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<PurchasePayment> {
    const client = tx || this.prisma;
    const record = await client.paymentMade.update({
      where: { id },
      data,
    });
    return record as unknown as PurchasePayment;
  }
}
