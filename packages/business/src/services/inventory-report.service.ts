import { PrismaClient } from '@prisma/client';
import {
  PaginatedResult,
  InventoryReportFilters,
  InventoryCurrentStockRow,
  LowStockReportRow,
  OutOfStockReportRow,
  StockMovementReportRow,
  InventoryValuationRow,
  InventoryValuationSummary,
  StockAdjustmentReportRow,
} from '@rs-inventory/types';
import {
  resolveDateRange,
  roundCurrency,
} from '../repositories/reporting.repository.js';

export class InventoryReportService {
  constructor(private readonly prisma: PrismaClient) {}

  private getStockStatus(
    currentStock: number,
    minimumStock: number,
  ): 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'NEGATIVE' {
    if (currentStock < 0) return 'NEGATIVE';
    if (currentStock === 0) return 'OUT_OF_STOCK';
    if (minimumStock > 0 && currentStock <= minimumStock) return 'LOW_STOCK';
    return 'IN_STOCK';
  }

  // ── Current Stock Report ─────────────────────────────────────────────────────

  public async getCurrentStockReport(
    companyId: string,
    filters: InventoryReportFilters = {},
  ): Promise<PaginatedResult<InventoryCurrentStockRow>> {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(500, Math.max(10, filters.pageSize ?? 50));
    const skip = (page - 1) * pageSize;

    const where: any = {
      companyId,
      trackStock: true,
      isActive: true,
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.brandId ? { brandId: filters.brandId } : {}),
    };

    if (filters.stockStatus && filters.stockStatus !== 'ALL') {
      switch (filters.stockStatus) {
        case 'LOW_STOCK':
          where.currentStock = { gt: 0 };
          // will filter post-query for minimumStock comparison
          break;
        case 'OUT_OF_STOCK':
          where.currentStock = { lte: 0 };
          break;
        case 'IN_STOCK':
          where.currentStock = { gt: 0 };
          break;
      }
    }

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          sku: true,
          barcode: true,
          currentStock: true,
          minimumStock: true,
          purchasePrice: true,
          sellingPrice: true,
          openingStockRate: true,
          trackStock: true,
          category: { select: { name: true } },
          unit: { select: { name: true } },
          brand: { select: { name: true } },
        },
      }),
    ]);

    const rows: InventoryCurrentStockRow[] = products
      .filter((p) => {
        if (filters.stockStatus === 'LOW_STOCK') {
          return p.currentStock > 0 && p.minimumStock > 0 && p.currentStock <= p.minimumStock;
        }
        return true;
      })
      .map((p) => {
        const costBase = p.purchasePrice > 0 ? p.purchasePrice : p.openingStockRate;
        const hasCostData = costBase > 0;
        const status = this.getStockStatus(p.currentStock, p.minimumStock);
        return {
          productId: p.id,
          productName: p.name,
          sku: p.sku,
          barcode: p.barcode,
          categoryName: p.category?.name ?? null,
          unitName: p.unit?.name ?? null,
          brandName: p.brand?.name ?? null,
          currentStock: p.currentStock,
          minimumStock: p.minimumStock,
          stockStatus: status,
          purchasePrice: p.purchasePrice,
          sellingPrice: p.sellingPrice,
          estimatedValue: roundCurrency(p.currentStock * costBase),
          hasCostData,
          trackStock: p.trackStock,
        };
      });

    return {
      items: rows,
      data: rows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // ── Low Stock Report ─────────────────────────────────────────────────────────

  public async getLowStockReport(
    companyId: string,
    filters: InventoryReportFilters = {},
  ): Promise<LowStockReportRow[]> {
    const products = await this.prisma.product.findMany({
      where: {
        companyId,
        trackStock: true,
        isActive: true,
        currentStock: { gt: 0 },
        minimumStock: { gt: 0 },
        ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
        ...(filters.brandId ? { brandId: filters.brandId } : {}),
      },
      select: {
        id: true,
        name: true,
        sku: true,
        currentStock: true,
        minimumStock: true,
        category: { select: { name: true } },
        unit: { select: { name: true } },
      },
      orderBy: { currentStock: 'asc' },
    });

    return products
      .filter((p) => p.currentStock <= p.minimumStock)
      .map((p) => ({
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        categoryName: p.category?.name ?? null,
        unitName: p.unit?.name ?? null,
        currentStock: p.currentStock,
        minimumStock: p.minimumStock,
        shortfall: roundCurrency(p.minimumStock - p.currentStock),
      }));
  }

  // ── Out of Stock Report ──────────────────────────────────────────────────────

  public async getOutOfStockReport(
    companyId: string,
    filters: InventoryReportFilters = {},
  ): Promise<OutOfStockReportRow[]> {
    const products = await this.prisma.product.findMany({
      where: {
        companyId,
        trackStock: true,
        isActive: true,
        currentStock: { lte: 0 },
        ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      },
      select: {
        id: true,
        name: true,
        sku: true,
        currentStock: true,
        minimumStock: true,
        category: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    });

    return products.map((p) => ({
      productId: p.id,
      productName: p.name,
      sku: p.sku,
      categoryName: p.category?.name ?? null,
      currentStock: p.currentStock,
      isNegative: p.currentStock < 0,
      minimumStock: p.minimumStock,
    }));
  }

  // ── Stock Movement Report ────────────────────────────────────────────────────

  public async getStockMovementsReport(
    companyId: string,
    filters: InventoryReportFilters = {},
  ): Promise<PaginatedResult<StockMovementReportRow>> {
    const range = resolveDateRange(filters);
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(500, Math.max(10, filters.pageSize ?? 50));
    const skip = (page - 1) * pageSize;

    const where: any = {
      companyId,
      movementDate: { gte: range.gte, lte: range.lte },
      ...(filters.productId ? { productId: filters.productId } : {}),
      ...(filters.movementType ? { movementType: filters.movementType } : {}),
    };

    const [total, movements] = await Promise.all([
      this.prisma.stockMovement.count({ where }),
      this.prisma.stockMovement.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { movementDate: 'desc' },
        select: {
          id: true,
          movementDate: true,
          movementType: true,
          quantity: true,
          unitCost: true,
          referenceType: true,
          referenceNumber: true,
          notes: true,
          createdBy: true,
          product: { select: { name: true, sku: true } },
        },
      }),
    ]);

    const rows: StockMovementReportRow[] = movements.map((m) => ({
      id: m.id,
      movementDate: m.movementDate,
      productName: m.product.name,
      sku: m.product.sku,
      movementType: m.movementType,
      referenceType: m.referenceType,
      referenceNumber: m.referenceNumber,
      quantityIn: m.quantity > 0 ? m.quantity : 0,
      quantityOut: m.quantity < 0 ? Math.abs(m.quantity) : 0,
      unitCost: m.unitCost,
      notes: m.notes,
      createdBy: m.createdBy,
    }));

    return { items: rows, data: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // ── Inventory Valuation Report ───────────────────────────────────────────────

  public async getInventoryValuationReport(
    companyId: string,
    filters: InventoryReportFilters = {},
  ): Promise<InventoryValuationSummary> {
    const products = await this.prisma.product.findMany({
      where: {
        companyId,
        trackStock: true,
        isActive: true,
        ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
        ...(filters.brandId ? { brandId: filters.brandId } : {}),
      },
      select: {
        id: true,
        name: true,
        sku: true,
        currentStock: true,
        purchasePrice: true,
        openingStockRate: true,
        category: { select: { name: true } },
        unit: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    });

    const rows: InventoryValuationRow[] = [];
    let totalValue = 0;
    let withCost = 0;
    let withoutCost = 0;

    for (const p of products) {
      let unitCost = 0;
      let costSource: 'PURCHASE_PRICE' | 'OPENING_STOCK_RATE' | 'NONE' = 'NONE';

      if (p.purchasePrice > 0) {
        unitCost = p.purchasePrice;
        costSource = 'PURCHASE_PRICE';
      } else if (p.openingStockRate > 0) {
        unitCost = p.openingStockRate;
        costSource = 'OPENING_STOCK_RATE';
      }

      const hasCostData = unitCost > 0;
      const estimatedValue = roundCurrency(Math.max(0, p.currentStock) * unitCost);
      totalValue += estimatedValue;
      if (hasCostData) withCost++; else withoutCost++;

      rows.push({
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        categoryName: p.category?.name ?? null,
        unitName: p.unit?.name ?? null,
        currentStock: p.currentStock,
        unitCost,
        estimatedValue,
        hasCostData,
        costSource,
      });
    }

    const now = new Date();
    const limitation = withoutCost > 0
      ? `${withoutCost} product(s) have no recorded cost and are excluded from the valuation total. Estimated total reflects only products with available cost data.`
      : null;

    return {
      rows,
      totalEstimatedValue: roundCurrency(totalValue),
      totalProducts: products.length,
      productsWithCostData: withCost,
      productsWithoutCostData: withoutCost,
      valuationDate: now.toISOString().split('T')[0],
      methodology: 'Current purchase price (or opening stock rate if no purchase price recorded). Not a formal weighted-average cost calculation.',
      limitation,
    };
  }

  // ── Stock Adjustment Report ──────────────────────────────────────────────────

  public async getStockAdjustmentsReport(
    companyId: string,
    filters: InventoryReportFilters = {},
  ): Promise<StockAdjustmentReportRow[]> {
    const range = resolveDateRange(filters);

    const adjustments = await this.prisma.stockAdjustment.findMany({
      where: {
        companyId,
        status: 'POSTED',
        createdAt: { gte: range.gte, lte: range.lte },
      },
      include: {
        items: {
          include: { product: { select: { name: true, sku: true } } },
        },
        location: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const rows: StockAdjustmentReportRow[] = [];
    for (const adj of adjustments) {
      for (const item of adj.items) {
        if (filters.productId && item.productId !== filters.productId) continue;
        rows.push({
          adjustmentId: adj.id,
          adjustmentNumber: adj.adjustmentNumber,
          adjustmentDate: adj.createdAt,
          productName: item.product.name,
          sku: item.product.sku,
          locationName: adj.location.name,
          adjustmentType: adj.adjustmentType,
          systemQuantity: item.systemQuantity,
          differenceQuantity: item.differenceQuantity,
          reason: adj.reason,
          createdBy: adj.createdBy,
          unitCost: item.unitCost,
        });
      }
    }

    return rows;
  }
}
