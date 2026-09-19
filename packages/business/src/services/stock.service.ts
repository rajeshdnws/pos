import { Prisma, PrismaClient } from '@prisma/client';
import {
  CurrentStockFilterDTO,
  CurrentStockItem,
  InventoryKPIs,
  InventoryValuationByCategory,
  InventoryValuationReport,
  PaginatedResult,
  StockMovement,
  StockMovementFilterDTO,
  StockMovementType,
  StockReconciliationItem,
  StockReconciliationReport,
} from '@rs-inventory/types';
import { BusinessRuleError, ValidationError } from '../errors/app.error.js';
import { LocationRepository } from '../repositories/location.repository.js';
import { StockBalanceRepository } from '../repositories/stock-balance.repository.js';
import { StockMovementRepository } from '../repositories/stock-movement.repository.js';
import { AuditService } from './audit.service.js';

export interface RecordMovementParams {
  companyId: string;
  productId: string;
  locationId?: string;
  movementType: StockMovementType;
  quantity: number; // Signed: + for incoming, - for outgoing
  unitCost?: number;
  referenceType?: string;
  referenceId?: string;
  referenceNumber?: string;
  notes?: string | null;
  userId?: string | null;
  tx?: Prisma.TransactionClient;
}

export class StockService {
  private movementRepo: StockMovementRepository;
  private balanceRepo: StockBalanceRepository;
  private locationRepo: LocationRepository;
  private auditService: AuditService;

  constructor(private readonly prisma: PrismaClient) {
    this.movementRepo = new StockMovementRepository(prisma);
    this.balanceRepo = new StockBalanceRepository(prisma);
    this.locationRepo = new LocationRepository(prisma);
    this.auditService = new AuditService(prisma);
  }

  /**
   * Central atomic stock movement recorder.
   * Enforces:
   * 1. Product existence & trackStock flag
   * 2. Unit decimal constraints (disallows fractions if allowDecimals=false)
   * 3. Negative stock prevention (if setting allow_negative_stock is false)
   * 4. Single-transaction movement entry and balance projection update.
   */
  public async recordMovement(params: RecordMovementParams): Promise<StockMovement> {
    const {
      companyId,
      productId,
      locationId: providedLocationId,
      movementType,
      quantity,
      unitCost,
      referenceType,
      referenceId,
      referenceNumber,
      notes,
      userId,
      tx,
    } = params;

    if (quantity === 0) {
      throw new ValidationError('Stock movement quantity cannot be 0.');
    }

    const runInTransaction = async (client: Prisma.TransactionClient): Promise<StockMovement> => {
      // 1. Fetch Product with Unit
      const product = await client.product.findUnique({
        where: { id: productId },
        include: { unit: true },
      });

      if (!product) {
        throw new BusinessRuleError(`Product with ID ${productId} not found.`);
      }

      if (product.companyId !== companyId) {
        throw new BusinessRuleError('Product does not belong to the active company.');
      }

      // Check decimal precision constraint
      if (product.unit && !product.unit.allowDecimals && !Number.isInteger(quantity)) {
        throw new ValidationError(
          `Unit "${product.unit.shortCode}" does not allow fractional quantities (${quantity}).`,
        );
      }

      // If product does not track stock (e.g. SERVICE or NON_STOCK), we skip physical ledger
      if (!product.trackStock || product.productType !== 'PHYSICAL') {
        // Return dummy movement record or create note-only
      }

      // 2. Resolve Location
      let locationId = providedLocationId;
      if (!locationId) {
        const defaultLoc = await this.locationRepo.getDefault(companyId);
        locationId = defaultLoc.id;
      }

      const location = await client.inventoryLocation.findUnique({
        where: { id: locationId },
      });
      if (!location) {
        throw new BusinessRuleError(`Location with ID ${locationId} not found.`);
      }

      // 3. Negative Stock Prevention Check
      if (quantity < 0) {
        const setting = await client.setting.findUnique({
          where: {
            companyId_key: {
              companyId,
              key: 'allow_negative_stock',
            },
          },
        });
        const allowNegative = setting ? setting.value === 'true' : false;

        if (!allowNegative) {
          const currentBalance = await client.stockBalance.findUnique({
            where: {
              companyId_productId_locationId: {
                companyId,
                productId,
                locationId,
              },
            },
          });

          const existingQty = currentBalance ? currentBalance.quantity : 0;
          const resultingQty = Number((existingQty + quantity).toFixed(4));

          if (resultingQty < 0) {
            throw new BusinessRuleError(
              `Insufficient stock for "${product.name}" at "${location.name}". Available: ${existingQty}, Requested decrease: ${Math.abs(
                quantity,
              )}. Negative stock is disabled.`,
            );
          }
        }
      }

      const resolvedCost = unitCost !== undefined ? unitCost : product.purchasePrice;

      // 4. Create Movement Record
      const movement = (await client.stockMovement.create({
        data: {
          companyId,
          productId,
          locationId,
          movementType,
          quantity: Number(quantity.toFixed(4)),
          unitCost: resolvedCost,
          referenceType: referenceType || null,
          referenceId: referenceId || null,
          referenceNumber: referenceNumber || null,
          notes: notes || null,
          createdBy: userId || 'SYSTEM',
        },
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
      })) as unknown as StockMovement;

      // 5. Update Stock Balance projection
      await this.balanceRepo.upsertBalance(companyId, productId, locationId, quantity, client);

      return movement;
    };

    if (tx) {
      return runInTransaction(tx);
    } else {
      return this.prisma.$transaction(runInTransaction);
    }
  }

  public async getCurrentStock(
    companyId: string,
    filter: CurrentStockFilterDTO = {},
  ): Promise<PaginatedResult<CurrentStockItem>> {
    return this.balanceRepo.getCurrentStockItems(companyId, filter);
  }

  public async getStockMovements(
    companyId: string,
    filter: StockMovementFilterDTO = {},
  ): Promise<PaginatedResult<StockMovement>> {
    return this.movementRepo.findMovements(companyId, filter);
  }

  public async getProductStockSummary(
    companyId: string,
    productId: string,
  ): Promise<{
    currentStock: number;
    valuation: number;
    balances: { locationId: string; locationName: string; quantity: number }[];
  }> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new BusinessRuleError('Product not found.');
    }

    const balances = await this.balanceRepo.getLocationBalancesForProduct(companyId, productId);
    const totalStock = balances.reduce((sum, b) => sum + b.quantity, 0);
    const valuation = Number((totalStock * product.purchasePrice).toFixed(2));

    return {
      currentStock: totalStock,
      valuation,
      balances,
    };
  }

  public async getInventoryValuation(companyId: string): Promise<InventoryValuationReport> {
    const products = await this.prisma.product.findMany({
      where: { companyId, isActive: true, trackStock: true },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    let totalItems = 0;
    let totalQuantity = 0;
    let totalCostValuation = 0;
    let totalRetailValuation = 0;

    const categoryMap = new Map<
      string,
      {
        categoryId: string;
        categoryName: string;
        productCount: number;
        totalQuantity: number;
        totalValuation: number;
        retailValuation: number;
      }
    >();

    for (const prod of products) {
      const qty = prod.currentStock;
      const costVal = Number((qty * prod.purchasePrice).toFixed(2));
      const retailVal = Number((qty * prod.sellingPrice).toFixed(2));

      totalItems += 1;
      totalQuantity += qty;
      totalCostValuation += costVal;
      totalRetailValuation += retailVal;

      const catId = prod.categoryId || 'UNCATEGORIZED';
      const catName = prod.category?.name || 'Uncategorized';

      const existingCat = categoryMap.get(catId) || {
        categoryId: catId,
        categoryName: catName,
        productCount: 0,
        totalQuantity: 0,
        totalValuation: 0,
        retailValuation: 0,
      };

      existingCat.productCount += 1;
      existingCat.totalQuantity += qty;
      existingCat.totalValuation += costVal;
      existingCat.retailValuation += retailVal;

      categoryMap.set(catId, existingCat);
    }

    const byCategory: InventoryValuationByCategory[] = Array.from(categoryMap.values()).map((c) => ({
      categoryId: c.categoryId,
      categoryName: c.categoryName,
      productCount: c.productCount,
      totalQuantity: Number(c.totalQuantity.toFixed(4)),
      totalCostValuation: Number(c.totalValuation.toFixed(2)),
      totalRetailValuation: Number(c.retailValuation.toFixed(2)),
    }));


    return {
      totalItems,
      totalQuantity: Number(totalQuantity.toFixed(4)),
      totalCostValuation: Number(totalCostValuation.toFixed(2)),
      totalRetailValuation: Number(totalRetailValuation.toFixed(2)),
      potentialProfit: Number((totalRetailValuation - totalCostValuation).toFixed(2)),
      byCategory,
    };
  }

  public async getInventoryKPIs(companyId: string): Promise<InventoryKPIs> {
    const products = await this.prisma.product.findMany({
      where: { companyId, isActive: true },
      select: {
        id: true,
        currentStock: true,
        minimumStock: true,
        purchasePrice: true,
        trackStock: true,
      },
    });

    let totalStockQuantity = 0;
    let totalStockValuation = 0;
    let lowStockItemsCount = 0;
    let outOfStockItemsCount = 0;
    let negativeStockItemsCount = 0;

    for (const p of products) {
      if (!p.trackStock) continue;

      totalStockQuantity += p.currentStock;
      totalStockValuation += p.currentStock * p.purchasePrice;

      if (p.currentStock < 0) {
        negativeStockItemsCount += 1;
      } else if (p.currentStock === 0) {
        outOfStockItemsCount += 1;
      } else if (p.currentStock <= p.minimumStock) {
        lowStockItemsCount += 1;
      }
    }

    const totalLocationsCount = await this.prisma.inventoryLocation.count({
      where: { companyId, isActive: true },
    });

    const recentMovementsCount = await this.movementRepo.getRecentMovementsCount(companyId, 7);

    return {
      totalProducts: products.length,
      totalStockQuantity: Number(totalStockQuantity.toFixed(4)),
      totalStockValuation: Number(totalStockValuation.toFixed(2)),
      lowStockItemsCount,
      outOfStockItemsCount,
      negativeStockItemsCount,
      totalLocationsCount,
      recentMovementsCount,
    };
  }

  /**
   * Reconciles the authoritative stock ledger with current stock balance projections.
   */
  public async reconcileStock(companyId: string): Promise<StockReconciliationReport> {
    const products = await this.prisma.product.findMany({
      where: { companyId, isActive: true, trackStock: true },
      include: {
        unit: true,
        stockBalances: {
          include: { location: true },
        },
      },
    });

    const locations = await this.prisma.inventoryLocation.findMany({
      where: { companyId },
    });

    const ledgerSums = await this.movementRepo.getAllLedgerSumsByCompany(companyId);
    const ledgerMap = new Map<string, number>();
    for (const sumItem of ledgerSums) {
      ledgerMap.set(`${sumItem.productId}_${sumItem.locationId}`, sumItem.totalQuantity);
    }

    const items: StockReconciliationItem[] = [];
    let inSyncCount = 0;
    let discrepancyCount = 0;

    for (const prod of products) {
      for (const loc of locations) {
        const key = `${prod.id}_${loc.id}`;
        const ledgerBal = Number((ledgerMap.get(key) || 0).toFixed(4));
        const balanceRec = prod.stockBalances.find((b) => b.locationId === loc.id);
        const projectedBal = Number((balanceRec ? balanceRec.quantity : 0).toFixed(4));

        const discrepancy = Number((ledgerBal - projectedBal).toFixed(4));
        const isSynced = Math.abs(discrepancy) < 0.0001;

        if (isSynced) {
          inSyncCount += 1;
        } else {
          discrepancyCount += 1;
        }

        // Only include in report if there is stock, or movement, or discrepancy
        if (ledgerBal !== 0 || projectedBal !== 0 || !isSynced) {
          items.push({
            productId: prod.id,
            productName: prod.name,
            sku: prod.sku || '',
            unitSymbol: prod.unit?.shortCode || 'PCS',
            locationId: loc.id,
            locationName: loc.name,
            ledgerBalance: ledgerBal,
            projectedBalance: projectedBal,
            discrepancy,
            isSynced,
          });
        }
      }
    }

    return {
      timestamp: new Date().toISOString(),
      totalProductsChecked: products.length,
      inSyncCount,
      discrepancyCount,
      items,
    };
  }

  /**
   * Repairs discrepancies in stock_balances by synchronizing with the authoritative ledger sums.
   */
  public async repairStockDiscrepancies(
    companyId: string,
    userId?: string,
  ): Promise<{ repairedCount: number }> {
    const report = await this.reconcileStock(companyId);
    const discrepancies = report.items.filter((item) => !item.isSynced);

    if (discrepancies.length === 0) {
      return { repairedCount: 0 };
    }

    await this.prisma.$transaction(async (tx) => {
      for (const item of discrepancies) {
        await this.balanceRepo.setBalance(
          companyId,
          item.productId,
          item.locationId,
          item.ledgerBalance,
          tx,
        );
      }
    });

    await this.auditService.log({
      companyId,
      userId,
      action: 'STOCK_RECONCILED_AND_REPAIRED',
      module: 'INVENTORY',
      newValue: JSON.stringify({
        message: `Repaired ${discrepancies.length} stock projection discrepancies from authoritative ledger.`,
        discrepancies,
      }),
    });


    return { repairedCount: discrepancies.length };
  }
}
