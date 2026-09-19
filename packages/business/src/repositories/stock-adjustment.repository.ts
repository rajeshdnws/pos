import { Prisma, PrismaClient } from '@prisma/client';
import { StockAdjustment } from '@rs-inventory/types';

export class StockAdjustmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async generateAdjustmentNumber(companyId: string): Promise<string> {
    const count = await this.prisma.stockAdjustment.count({
      where: { companyId },
    });
    const nextNumber = count + 1;
    return `ADJ-${String(nextNumber).padStart(6, '0')}`;
  }

  public async findById(id: string): Promise<StockAdjustment | null> {
    const record = await this.prisma.stockAdjustment.findUnique({
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
    return record as unknown as StockAdjustment | null;
  }

  public async findAll(companyId: string, limit: number = 50): Promise<StockAdjustment[]> {
    const records = await this.prisma.stockAdjustment.findMany({
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
    return records as unknown as StockAdjustment[];
  }

  public async create(
    data: Prisma.StockAdjustmentUncheckedCreateInput,
    items: Prisma.StockAdjustmentItemUncheckedCreateWithoutAdjustmentInput[],
    tx?: Prisma.TransactionClient,
  ): Promise<StockAdjustment> {
    const client = tx || this.prisma;
    const record = await client.stockAdjustment.create({
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
                unit: { select: { shortCode: true, allowDecimals: true } },
              },
            },
          },
        },
      },
    });
    return record as unknown as StockAdjustment;
  }
}
