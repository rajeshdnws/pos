import { Prisma, PrismaClient } from '@prisma/client';
import {
  CurrentStockFilterDTO,
  CurrentStockItem,
  PaginatedResult,
  StockBalance,
  StockStatus,
} from '@rs-inventory/types';

export class StockBalanceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async getBalance(
    companyId: string,
    productId: string,
    locationId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<StockBalance | null> {
    const client = tx || this.prisma;
    const record = await client.stockBalance.findUnique({
      where: {
        companyId_productId_locationId: {
          companyId,
          productId,
          locationId,
        },
      },
    });
    return record as unknown as StockBalance | null;
  }

  public async getLocationBalancesForProduct(
    companyId: string,
    productId: string,
  ): Promise<{ locationId: string; locationName: string; quantity: number }[]> {
    const records = await this.prisma.stockBalance.findMany({
      where: { companyId, productId },
      include: {
        location: {
          select: { id: true, name: true },
        },
      },
    });

    return records.map((r) => ({
      locationId: r.locationId,
      locationName: r.location?.name || 'Unknown',
      quantity: r.quantity,
    }));
  }

  public async getTotalProductStock(companyId: string, productId: string): Promise<number> {
    const agg = await this.prisma.stockBalance.aggregate({
      where: { companyId, productId },
      _sum: { quantity: true },
    });
    return agg._sum.quantity || 0;
  }

  public async upsertBalance(
    companyId: string,
    productId: string,
    locationId: string,
    deltaQuantity: number,
    tx?: Prisma.TransactionClient,
  ): Promise<StockBalance> {
    const client = tx || this.prisma;

    // Check existing
    const existing = await client.stockBalance.findUnique({
      where: {
        companyId_productId_locationId: {
          companyId,
          productId,
          locationId,
        },
      },
    });

    let newQuantity: number;
    let balanceRecord: StockBalance;

    if (existing) {
      newQuantity = Number((existing.quantity + deltaQuantity).toFixed(4));
      balanceRecord = (await client.stockBalance.update({
        where: { id: existing.id },
        data: { quantity: newQuantity },
      })) as unknown as StockBalance;
    } else {
      newQuantity = Number(deltaQuantity.toFixed(4));
      balanceRecord = (await client.stockBalance.create({
        data: {
          companyId,
          productId,
          locationId,
          quantity: newQuantity,
        },
      })) as unknown as StockBalance;
    }

    // Also update product.currentStock total across all locations
    const allBalances = await client.stockBalance.aggregate({
      where: { companyId, productId },
      _sum: { quantity: true },
    });

    const totalCurrentStock = Number((allBalances._sum.quantity || 0).toFixed(4));

    await client.product.update({
      where: { id: productId },
      data: { currentStock: totalCurrentStock },
    });

    return balanceRecord;
  }

  public async setBalance(
    companyId: string,
    productId: string,
    locationId: string,
    quantity: number,
    tx?: Prisma.TransactionClient,
  ): Promise<StockBalance> {
    const client = tx || this.prisma;

    const balanceRecord = (await client.stockBalance.upsert({
      where: {
        companyId_productId_locationId: {
          companyId,
          productId,
          locationId,
        },
      },
      update: {
        quantity: Number(quantity.toFixed(4)),
      },
      create: {
        companyId,
        productId,
        locationId,
        quantity: Number(quantity.toFixed(4)),
      },
    })) as unknown as StockBalance;

    // Update product.currentStock
    const allBalances = await client.stockBalance.aggregate({
      where: { companyId, productId },
      _sum: { quantity: true },
    });

    const totalCurrentStock = Number((allBalances._sum.quantity || 0).toFixed(4));

    await client.product.update({
      where: { id: productId },
      data: { currentStock: totalCurrentStock },
    });

    return balanceRecord;
  }

  public async getAllBalancesByCompany(
    companyId: string,
  ): Promise<StockBalance[]> {
    const records = await this.prisma.stockBalance.findMany({
      where: { companyId },
      include: {
        product: true,
        location: true,
      },
    });
    return records as unknown as StockBalance[];
  }

  public async getCurrentStockItems(
    companyId: string,
    filter: CurrentStockFilterDTO = {},
  ): Promise<PaginatedResult<CurrentStockItem>> {
    const {
      search,
      categoryId,
      brandId,
      locationId,
      status,
      lowStock,
      page = 1,
      pageSize = 25,
      sortBy = 'name',
      sortOrder = 'asc',
    } = filter;

    // If a specific location is selected, query stock_balances with location join
    // Otherwise query products joined with their total stock or aggregated per location
    const productWhere: Prisma.ProductWhereInput = {
      companyId,
      isActive: true,
      ...(categoryId ? { categoryId } : {}),
      ...(brandId ? { brandId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { sku: { contains: search } },
              { barcode: { contains: search } },
            ],
          }
        : {}),
    };

    // If location filter is active, we filter by products that have balances in that location
    if (locationId) {
      productWhere.stockBalances = {
        some: { locationId },
      };
    }

    const products = await this.prisma.product.findMany({
      where: productWhere,
      include: {
        category: { select: { id: true, name: true } },
        brand: { select: { id: true, name: true } },
        unit: { select: { id: true, shortCode: true, allowDecimals: true } },
        stockBalances: {
          where: locationId ? { locationId } : {},
          include: {
            location: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Transform products into CurrentStockItems
    let items: CurrentStockItem[] = [];

    for (const prod of products) {
      const unitSymbol = prod.unit?.shortCode || 'PCS';
      const allowDecimals = prod.unit?.allowDecimals || false;
      const categoryName = prod.category?.name || null;
      const brandName = prod.brand?.name || null;

      if (locationId) {
        // Single location view
        const balance = prod.stockBalances.find((b) => b.locationId === locationId);
        const currentQty = balance ? balance.quantity : 0;
        const locName = balance?.location?.name || 'Main Store';
        const valuation = Number((currentQty * prod.purchasePrice).toFixed(2));

        let computedStatus: StockStatus = 'IN_STOCK';
        if (currentQty < 0) {
          computedStatus = 'NEGATIVE_STOCK';
        } else if (currentQty === 0) {
          computedStatus = 'OUT_OF_STOCK';
        } else if (currentQty <= prod.minimumStock) {
          computedStatus = 'LOW_STOCK';
        }

        items.push({
          id: `${prod.id}_${locationId}`,
          productId: prod.id,
          productName: prod.name,
          shortName: prod.shortName,
          sku: prod.sku || '',
          barcode: prod.barcode,
          categoryName,
          brandName,
          unitSymbol,
          allowDecimals,
          locationId,
          locationName: locName,
          currentStock: currentQty,
          minimumStock: prod.minimumStock,
          maximumStock: prod.maximumStock,
          purchasePrice: prod.purchasePrice,
          sellingPrice: prod.sellingPrice,
          mrp: prod.mrp,
          taxRate: prod.taxRate,
          valuation,
          status: computedStatus,
          trackStock: prod.trackStock,
        });
      } else {
        // Aggregate/All locations view
        const totalQty = prod.currentStock;
        const valuation = Number((totalQty * prod.purchasePrice).toFixed(2));

        let computedStatus: StockStatus = 'IN_STOCK';
        if (totalQty < 0) {
          computedStatus = 'NEGATIVE_STOCK';
        } else if (totalQty === 0) {
          computedStatus = 'OUT_OF_STOCK';
        } else if (totalQty <= prod.minimumStock) {
          computedStatus = 'LOW_STOCK';
        }

        items.push({
          id: prod.id,
          productId: prod.id,
          productName: prod.name,
          shortName: prod.shortName,
          sku: prod.sku || '',
          barcode: prod.barcode,
          categoryName,
          brandName,
          unitSymbol,
          allowDecimals,
          locationId: 'ALL',
          locationName: 'All Locations',
          currentStock: totalQty,
          minimumStock: prod.minimumStock,
          maximumStock: prod.maximumStock,
          purchasePrice: prod.purchasePrice,
          sellingPrice: prod.sellingPrice,
          mrp: prod.mrp,
          taxRate: prod.taxRate,
          valuation,
          status: computedStatus,
          trackStock: prod.trackStock,
        });
      }
    }

    // Apply status and lowStock filter
    if (status) {
      items = items.filter((item) => item.status === status);
    }
    if (lowStock) {
      items = items.filter((item) => item.status === 'LOW_STOCK' || item.status === 'OUT_OF_STOCK');
    }

    // Sorting
    items.sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      switch (sortBy) {
        case 'sku':
          valA = a.sku.toLowerCase();
          valB = b.sku.toLowerCase();
          break;
        case 'currentStock':
          valA = a.currentStock;
          valB = b.currentStock;
          break;
        case 'valuation':
          valA = a.valuation;
          valB = b.valuation;
          break;
        case 'locationName':
          valA = a.locationName.toLowerCase();
          valB = b.locationName.toLowerCase();
          break;
        case 'name':
        default:
          valA = a.productName.toLowerCase();
          valB = b.productName.toLowerCase();
          break;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const total = items.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const currentPage = Math.max(1, Math.min(page, totalPages));
    const skip = (currentPage - 1) * pageSize;
    const pagedItems = items.slice(skip, skip + pageSize);

    return {
      items: pagedItems,
      total,
      page: currentPage,
      pageSize,
      totalPages,
    };
  }
}
