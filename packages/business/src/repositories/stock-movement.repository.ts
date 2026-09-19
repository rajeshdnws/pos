import { Prisma, PrismaClient } from '@prisma/client';
import { PaginatedResult, StockMovement, StockMovementFilterDTO } from '@rs-inventory/types';

export class StockMovementRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async create(
    data: Prisma.StockMovementUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<StockMovement> {
    const client = tx || this.prisma;
    const record = await client.stockMovement.create({
      data,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            barcode: true,
            unit: { select: { shortCode: true, allowDecimals: true } },
          },
        },
        location: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });
    return record as unknown as StockMovement;
  }

  public async findMovements(
    companyId: string,
    filter: StockMovementFilterDTO = {},
  ): Promise<PaginatedResult<StockMovement>> {
    const {
      productId,
      locationId,
      movementType,
      startDate,
      endDate,
      referenceType,
      search,
      page = 1,
      pageSize = 25,
    } = filter;

    const where: Prisma.StockMovementWhereInput = {
      companyId,
      ...(productId ? { productId } : {}),
      ...(locationId ? { locationId } : {}),
      ...(movementType ? { movementType } : {}),
      ...(referenceType ? { referenceType } : {}),
      ...(startDate || endDate
        ? {
            movementDate: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { referenceNumber: { contains: search } },
              { notes: { contains: search } },
              { product: { name: { contains: search } } },
              { product: { sku: { contains: search } } },
            ],
          }
        : {}),
    };

    const total = await this.prisma.stockMovement.count({ where });
    const totalPages = Math.ceil(total / pageSize) || 1;
    const currentPage = Math.max(1, Math.min(page, totalPages));
    const skip = (currentPage - 1) * pageSize;

    const items = await this.prisma.stockMovement.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            barcode: true,
            unit: { select: { shortCode: true, allowDecimals: true } },
          },
        },
        location: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: { movementDate: 'desc' },
      skip,
      take: pageSize,
    });

    return {
      items: items as unknown as StockMovement[],
      total,
      page: currentPage,
      pageSize,
      totalPages,
    };
  }

  public async getLedgerQuantitySum(
    companyId: string,
    productId: string,
    locationId?: string,
  ): Promise<number> {
    const result = await this.prisma.stockMovement.aggregate({
      where: {
        companyId,
        productId,
        ...(locationId ? { locationId } : {}),
      },
      _sum: {
        quantity: true,
      },
    });

    return result._sum.quantity || 0;
  }

  public async getAllLedgerSumsByCompany(
    companyId: string,
  ): Promise<{ productId: string; locationId: string; totalQuantity: number }[]> {
    const raw = await this.prisma.stockMovement.groupBy({
      by: ['productId', 'locationId'],
      where: { companyId },
      _sum: {
        quantity: true,
      },
    });

    return raw.map((r) => ({
      productId: r.productId,
      locationId: r.locationId,
      totalQuantity: r._sum.quantity || 0,
    }));
  }

  public async getRecentMovementsCount(companyId: string, days: number = 7): Promise<number> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.prisma.stockMovement.count({
      where: {
        companyId,
        movementDate: { gte: since },
      },
    });
  }
}
