import { Prisma, PrismaClient } from '@prisma/client';
import { PaginatedResult, PurchaseReturn, PurchaseReturnFilterDTO } from '@rs-inventory/types';

export class PurchaseReturnRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findById(id: string, companyId?: string): Promise<PurchaseReturn | null> {
    const where: Prisma.PurchaseReturnWhereInput = { id };
    if (companyId) where.companyId = companyId;

    const record = await this.prisma.purchaseReturn.findFirst({
      where,
      include: {
        supplier: true,
        purchase: true,
        location: true,
        items: {
          include: {
            product: {
              include: { unit: true },
            },
          },
        },
      },
    });

    return record as unknown as PurchaseReturn | null;
  }

  public async findMany(
    companyId: string,
    filters?: PurchaseReturnFilterDTO,
  ): Promise<PaginatedResult<PurchaseReturn>> {
    const page = Math.max(1, filters?.page || 1);
    const pageSize = Math.max(1, Math.min(100, filters?.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: Prisma.PurchaseReturnWhereInput = { companyId };

    if (filters?.purchaseId) where.purchaseId = filters.purchaseId;
    if (filters?.supplierId) where.supplierId = filters.supplierId;
    if (filters?.status) where.status = filters.status;

    if (filters?.startDate || filters?.endDate) {
      where.returnDate = {};
      if (filters.startDate) where.returnDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.returnDate.lte = new Date(filters.endDate);
    }

    if (filters?.search && filters.search.trim().length > 0) {
      const q = filters.search.trim();
      where.OR = [
        { returnNumber: { contains: q } },
        { reason: { contains: q } },
        { notes: { contains: q } },
        { purchase: { purchaseNumber: { contains: q } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.purchaseReturn.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { returnDate: 'desc' },
        include: {
          supplier: {
            select: { id: true, name: true, supplierCode: true },
          },
          purchase: {
            select: { id: true, purchaseNumber: true, grandTotal: true },
          },
          location: {
            select: { id: true, name: true, code: true },
          },
          items: {
            select: { id: true, quantity: true, lineTotal: true, productNameSnapshot: true },
          },
        },
      }),
      this.prisma.purchaseReturn.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize) || 1;

    return {
      items: items as unknown as PurchaseReturn[],
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  public async create(
    data: Prisma.PurchaseReturnUncheckedCreateInput,
    items: Prisma.PurchaseReturnItemUncheckedCreateWithoutPurchaseReturnInput[],
    tx?: Prisma.TransactionClient,
  ): Promise<PurchaseReturn> {
    const client = tx || this.prisma;
    const record = await client.purchaseReturn.create({
      data: {
        ...data,
        items: {
          create: items,
        },
      },
      include: {
        supplier: true,
        purchase: true,
        location: true,
        items: true,
      },
    });

    return record as unknown as PurchaseReturn;
  }
}
