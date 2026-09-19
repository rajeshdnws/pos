import { Prisma, PrismaClient } from '@prisma/client';
import { Stocktake } from '@rs-inventory/types';

export class StocktakeRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async generateStocktakeNumber(companyId: string): Promise<string> {
    const count = await this.prisma.stocktake.count({
      where: { companyId },
    });
    const nextNumber = count + 1;
    return `STK-${String(nextNumber).padStart(6, '0')}`;
  }

  public async findById(id: string): Promise<Stocktake | null> {
    const record = await this.prisma.stocktake.findUnique({
      where: { id },
      include: {
        location: {
          select: { id: true, name: true, code: true },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                barcode: true,
                purchasePrice: true,
                sellingPrice: true,
                unit: { select: { shortCode: true, allowDecimals: true } },
              },
            },
          },
        },
      },
    });
    return record as unknown as Stocktake | null;
  }

  public async findAll(companyId: string, limit: number = 50): Promise<Stocktake[]> {
    const records = await this.prisma.stocktake.findMany({
      where: { companyId },
      include: {
        location: {
          select: { id: true, name: true, code: true },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                unit: { select: { shortCode: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return records as unknown as Stocktake[];
  }

  public async create(
    data: Prisma.StocktakeUncheckedCreateInput,
    items: Prisma.StocktakeItemUncheckedCreateWithoutStocktakeInput[],
    tx?: Prisma.TransactionClient,
  ): Promise<Stocktake> {
    const client = tx || this.prisma;
    const record = await client.stocktake.create({
      data: {
        ...data,
        items: {
          create: items,
        },
      },
      include: {
        location: {
          select: { id: true, name: true, code: true },
        },
        items: {
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
          },
        },
      },
    });
    return record as unknown as Stocktake;
  }

  public async updateNotes(id: string, notes: string | null): Promise<Stocktake> {
    const record = await this.prisma.stocktake.update({
      where: { id },
      data: { notes },
      include: {
        location: true,
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, unit: true },
            },
          },
        },
      },
    });
    return record as unknown as Stocktake;
  }

  public async updateItemCount(
    stocktakeId: string,
    productId: string,
    countedQuantity: number,
    notes?: string | null,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx || this.prisma;
    const item = await client.stocktakeItem.findFirst({
      where: { stocktakeId, productId },
    });

    if (item) {
      const differenceQuantity = Number((countedQuantity - item.systemQuantity).toFixed(4));
      await client.stocktakeItem.update({
        where: { id: item.id },
        data: {
          countedQuantity,
          differenceQuantity,
          ...(notes !== undefined ? { notes } : {}),
        },
      });
    }
  }

  public async updateStatus(
    id: string,
    status: string,
    meta?: { completedBy?: string | null; completedAt?: Date | null; startedAt?: Date | null },
    tx?: Prisma.TransactionClient,
  ): Promise<Stocktake> {
    const client = tx || this.prisma;
    const record = await client.stocktake.update({
      where: { id },
      data: {
        status,
        ...(meta?.completedBy !== undefined ? { completedBy: meta.completedBy } : {}),
        ...(meta?.completedAt !== undefined ? { completedAt: meta.completedAt } : {}),
        ...(meta?.startedAt !== undefined ? { startedAt: meta.startedAt } : {}),
      },
      include: {
        location: true,
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, unit: true, purchasePrice: true },
            },
          },
        },
      },
    });
    return record as unknown as Stocktake;
  }
}
