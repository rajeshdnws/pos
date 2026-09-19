import { Prisma, PrismaClient } from '@prisma/client';
import { StockTransfer } from '@rs-inventory/types';

export class StockTransferRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async generateTransferNumber(companyId: string): Promise<string> {
    const count = await this.prisma.stockTransfer.count({
      where: { companyId },
    });
    const nextNumber = count + 1;
    return `TRF-${String(nextNumber).padStart(6, '0')}`;
  }

  public async findById(id: string): Promise<StockTransfer | null> {
    const record = await this.prisma.stockTransfer.findUnique({
      where: { id },
      include: {
        sourceLocation: {
          select: { id: true, name: true, code: true },
        },
        destinationLocation: {
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
                unit: { select: { shortCode: true, allowDecimals: true } },
              },
            },
          },
        },
      },
    });
    return record as unknown as StockTransfer | null;
  }

  public async findAll(companyId: string, limit: number = 50): Promise<StockTransfer[]> {
    const records = await this.prisma.stockTransfer.findMany({
      where: { companyId },
      include: {
        sourceLocation: {
          select: { id: true, name: true, code: true },
        },
        destinationLocation: {
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
    return records as unknown as StockTransfer[];
  }

  public async create(
    data: Prisma.StockTransferUncheckedCreateInput,
    items: Prisma.StockTransferItemUncheckedCreateWithoutTransferInput[],
    tx?: Prisma.TransactionClient,
  ): Promise<StockTransfer> {
    const client = tx || this.prisma;
    const record = await client.stockTransfer.create({
      data: {
        ...data,
        items: {
          create: items,
        },
      },
      include: {
        sourceLocation: {
          select: { id: true, name: true, code: true },
        },
        destinationLocation: {
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
    return record as unknown as StockTransfer;
  }

  public async updateStatus(
    id: string,
    status: string,
    tx?: Prisma.TransactionClient,
  ): Promise<StockTransfer> {
    const client = tx || this.prisma;
    const record = await client.stockTransfer.update({
      where: { id },
      data: { status },
      include: {
        sourceLocation: true,
        destinationLocation: true,
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, unit: true },
            },
          },
        },
      },
    });
    return record as unknown as StockTransfer;
  }
}
