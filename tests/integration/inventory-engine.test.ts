import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDatabase } from '../helpers/test-db';
import { CompanyService } from '../../packages/business/src/services/company.service';
import { ProductService } from '../../packages/business/src/services/product.service';
import { LocationService } from '../../packages/business/src/services/location.service';
import { StockService } from '../../packages/business/src/services/stock.service';
import { StockAdjustmentService } from '../../packages/business/src/services/stock-adjustment.service';
import { StocktakeService } from '../../packages/business/src/services/stocktake.service';
import { StockTransferService } from '../../packages/business/src/services/stock-transfer.service';
import { UnitService } from '../../packages/business/src/services/unit.service';

describe('Inventory & Stock Management Engine Integration Tests', () => {
  let cleanupFn: () => Promise<void>;
  let prisma: any;
  let companyService: CompanyService;
  let productService: ProductService;
  let locationService: LocationService;
  let stockService: StockService;
  let adjustmentService: StockAdjustmentService;
  let stocktakeService: StocktakeService;
  let transferService: StockTransferService;
  let unitService: UnitService;

  let company1Id: string;
  let user1Id: string;
  let company2Id: string;
  let user2Id: string;

  let defaultLocation1Id: string;
  let defaultCategoryId: string;
  let pcsUnitId: string;
  let company2CategoryId: string;

  beforeAll(async () => {
    const { dbService, cleanup } = await createTestDatabase();
    cleanupFn = cleanup;
    prisma = dbService.getClient();

    companyService = new CompanyService(prisma);
    productService = new ProductService(prisma);
    locationService = new LocationService(prisma);
    stockService = new StockService(prisma);
    adjustmentService = new StockAdjustmentService(prisma);
    stocktakeService = new StocktakeService(prisma);
    transferService = new StockTransferService(prisma);
    unitService = new UnitService(prisma);

    // Setup Company 1
    const setup1 = await companyService.setupCompanyAndAdmin({
      businessName: 'Apex Retail Store',
      adminFullName: 'Apex Admin',
      adminUsername: 'apexadmin',
      adminPassword: 'Password123!',
      gstRegistered: true,
      gstin: '27AAAAA0000A1Z5',
    });
    company1Id = setup1.company.id;
    user1Id = setup1.user.id;

    const defaultLoc1 = await locationService.getDefaultLocation(company1Id);
    defaultLocation1Id = defaultLoc1.id;

    const units1 = await unitService.getUnits(company1Id);
    pcsUnitId = units1.find((u) => u.shortCode === 'PCS')!.id;

    const cat1 = await prisma.category.create({
      data: {
        companyId: company1Id,
        name: 'General',
        isActive: true,
      },
    });
    defaultCategoryId = cat1.id;

    // Direct seed Company 2 (for multi-tenant isolation testing)
    const company2 = await prisma.company.create({
      data: {
        name: 'Beta Retail Hub',
        isActive: true,
      },
    });
    company2Id = company2.id;

    const user2 = await prisma.user.create({
      data: {
        companyId: company2Id,
        username: 'betaadmin',
        passwordHash: 'dummy_hash',
        name: 'Beta Admin',
        isActive: true,
      },
    });
    user2Id = user2.id;

    await prisma.inventoryLocation.create({
      data: {
        companyId: company2Id,
        name: 'Main Store',
        code: 'MAIN',
        isDefault: true,
        isActive: true,
      },
    });

    await prisma.unit.create({
      data: {
        companyId: company2Id,
        name: 'Pieces',
        shortCode: 'PCS',
        allowDecimals: false,
        isActive: true,
      },
    });

    const cat2 = await prisma.category.create({
      data: {
        companyId: company2Id,
        name: 'Electronics',
        isActive: true,
      },
    });
    company2CategoryId = cat2.id;
  });

  afterAll(async () => {
    if (cleanupFn) {
      await cleanupFn();
    }
  });

  it('1. should create opening stock ledger movement and balance projection on product creation', async () => {
    const product = await productService.createProduct(
      company1Id,
      {
        name: 'Wireless Optical Mouse',
        sku: 'MOU-001',
        categoryId: defaultCategoryId,
        unitId: pcsUnitId,
        purchasePrice: 300,
        sellingPrice: 599,
        openingStock: 25,
        openingStockRate: 300,
      },
      user1Id,
    );

    expect(product.currentStock).toBe(25);

    // Verify StockMovement entry
    const movements = await stockService.getStockMovements(company1Id, { productId: product.id });
    expect(movements.total).toBe(1);
    expect(movements.items[0]?.movementType).toBe('OPENING_STOCK');
    expect(movements.items[0]?.quantity).toBe(25);
    expect(movements.items[0]?.unitCost).toBe(300);

    // Verify StockBalance projection
    const summary = await stockService.getProductStockSummary(company1Id, product.id);
    expect(summary.currentStock).toBe(25);
    expect(summary.valuation).toBe(7500); // 25 * 300
    expect(summary.balances[0]?.locationId).toBe(defaultLocation1Id);
    expect(summary.balances[0]?.quantity).toBe(25);
  });

  it('2. should process stock adjustment INCREASE (+)', async () => {
    const product = await productService.createProduct(
      company1Id,
      {
        name: 'USB-C Fast Cable',
        sku: 'CAB-001',
        categoryId: defaultCategoryId,
        unitId: pcsUnitId,
        purchasePrice: 100,
        sellingPrice: 249,
        openingStock: 10,
      },
      user1Id,
    );

    const adjustment = await adjustmentService.createAdjustment(
      company1Id,
      {
        locationId: defaultLocation1Id,
        type: 'INCREASE',
        reason: 'Found Surplus Inventory',
        items: [{ productId: product.id, quantity: 5, unitCost: 100 }],
      },
      user1Id,
    );

    expect(adjustment.adjustmentNumber).toMatch(/^ADJ-\d{6}$/);
    expect(adjustment.status).toBe('POSTED');

    // Verify movement
    const movements = await stockService.getStockMovements(company1Id, { productId: product.id });
    const adjMove = movements.items.find((m) => m.movementType === 'ADJUSTMENT_IN');
    expect(adjMove).toBeDefined();
    expect(adjMove?.quantity).toBe(5);

    // Verify new stock level is 10 + 5 = 15
    const updatedSummary = await stockService.getProductStockSummary(company1Id, product.id);
    expect(updatedSummary.currentStock).toBe(15);
  });

  it('3. should process stock adjustment DECREASE (-) and enforce mandatory reasons', async () => {
    const product = await productService.createProduct(
      company1Id,
      {
        name: 'Glass Screen Protector',
        sku: 'SCR-001',
        categoryId: defaultCategoryId,
        unitId: pcsUnitId,
        purchasePrice: 50,
        sellingPrice: 199,
        openingStock: 20,
      },
      user1Id,
    );

    // Attempt without reason -> should fail
    await expect(
      adjustmentService.createAdjustment(
        company1Id,
        {
          locationId: defaultLocation1Id,
          type: 'DECREASE',
          reason: '', // Empty reason
          items: [{ productId: product.id, quantity: 2 }],
        },
        user1Id,
      ),
    ).rejects.toThrow();

    // Valid decrease
    const adjustment = await adjustmentService.createAdjustment(
      company1Id,
      {
        locationId: defaultLocation1Id,
        type: 'DECREASE',
        reason: 'Damaged during unloading',
        items: [{ productId: product.id, quantity: 4 }],
      },
      user1Id,
    );

    expect(adjustment.adjustmentType).toBe('DECREASE');

    const updatedSummary = await stockService.getProductStockSummary(company1Id, product.id);
    expect(updatedSummary.currentStock).toBe(16); // 20 - 4 = 16
  });

  it('4. should block negative stock when allow_negative_stock is disabled', async () => {
    const product = await productService.createProduct(
      company1Id,
      {
        name: 'Limited Edition Smart Watch',
        sku: 'WAT-001',
        categoryId: defaultCategoryId,
        unitId: pcsUnitId,
        purchasePrice: 2000,
        sellingPrice: 4999,
        openingStock: 3,
      },
      user1Id,
    );

    // Attempt to decrease 5 units when only 3 are in stock
    await expect(
      adjustmentService.createAdjustment(
        company1Id,
        {
          locationId: defaultLocation1Id,
          type: 'DECREASE',
          reason: 'Excess write-off',
          items: [{ productId: product.id, quantity: 5 }],
        },
        user1Id,
      ),
    ).rejects.toThrow(/Insufficient stock/);
  });

  it('5. should enforce unit decimal constraint during movements', async () => {
    const product = await productService.createProduct(
      company1Id,
      {
        name: 'Mechanical Gaming Keyboard',
        sku: 'KEY-001',
        categoryId: defaultCategoryId,
        unitId: pcsUnitId, // allowDecimals: false
        purchasePrice: 1500,
        sellingPrice: 2999,
        openingStock: 5,
      },
      user1Id,
    );

    // Attempt to adjust by 1.5 units on a non-decimal item
    await expect(
      adjustmentService.createAdjustment(
        company1Id,
        {
          locationId: defaultLocation1Id,
          type: 'INCREASE',
          reason: 'Count test',
          items: [{ productId: product.id, quantity: 1.5 }],
        },
        user1Id,
      ),
    ).rejects.toThrow(/does not allow decimals/);
  });

  it('6. should execute atomic inter-location stock transfer with cost preservation', async () => {
    // Create Secondary Location
    const warehouse = await locationService.createLocation(
      company1Id,
      {
        name: 'North Warehouse',
        code: 'WH-NORTH',
        type: 'WAREHOUSE',
      },
      user1Id,
    );

    const product = await productService.createProduct(
      company1Id,
      {
        name: 'HDMI 2.1 4K Cable',
        sku: 'HDMI-4K',
        categoryId: defaultCategoryId,
        unitId: pcsUnitId,
        purchasePrice: 250,
        sellingPrice: 499,
        openingStock: 30, // in Main Store
      },
      user1Id,
    );

    // Transfer 10 units from Main Store to North Warehouse
    const transfer = await transferService.createTransfer(
      company1Id,
      {
        sourceLocationId: defaultLocation1Id,
        destinationLocationId: warehouse.id,
        notes: 'Stock replenishment to North Warehouse',
        items: [{ productId: product.id, quantity: 10, unitCost: 250 }],
      },
      user1Id,
    );

    expect(transfer.transferNumber).toMatch(/^TRF-\d{6}$/);
    expect(transfer.status).toBe('COMPLETED');

    // Check balances in both locations
    const summary = await stockService.getProductStockSummary(company1Id, product.id);
    expect(summary.currentStock).toBe(30); // Total across all locations remains 30

    const mainStoreBalance = summary.balances.find((b) => b.locationId === defaultLocation1Id);
    const warehouseBalance = summary.balances.find((b) => b.locationId === warehouse.id);

    expect(mainStoreBalance?.quantity).toBe(20); // 30 - 10 = 20
    expect(warehouseBalance?.quantity).toBe(10); // 0 + 10 = 10
  });

  it('7. should reverse stock on transfer cancellation', async () => {
    const warehouse = await locationService.getLocation(
      (await locationService.getLocations(company1Id)).find((l) => l.code === 'WH-NORTH')!.id,
    );

    const product = await productService.createProduct(
      company1Id,
      {
        name: 'Desk Fan Mini USB',
        sku: 'FAN-001',
        categoryId: defaultCategoryId,
        unitId: pcsUnitId,
        purchasePrice: 400,
        sellingPrice: 799,
        openingStock: 10,
      },
      user1Id,
    );

    const transfer = await transferService.createTransfer(
      company1Id,
      {
        sourceLocationId: defaultLocation1Id,
        destinationLocationId: warehouse!.id,
        items: [{ productId: product.id, quantity: 4, unitCost: 400 }],
      },
      user1Id,
    );

    // Cancel transfer
    const cancelled = await transferService.cancelTransfer(transfer.id, user1Id);
    expect(cancelled.status).toBe('CANCELLED');

    // Balances should be back to 10 in Main Store and 0 in Warehouse
    const summary = await stockService.getProductStockSummary(company1Id, product.id);
    const mainBalance = summary.balances.find((b) => b.locationId === defaultLocation1Id);
    const whBalance = summary.balances.find((b) => b.locationId === warehouse!.id);

    expect(mainBalance?.quantity).toBe(10);
    expect(whBalance?.quantity).toBe(0);
  });

  it('8. should conduct physical stocktake session and post variance corrections', async () => {
    const product = await productService.createProduct(
      company1Id,
      {
        name: 'Bluetooth Speaker Portable',
        sku: 'SPK-001',
        categoryId: defaultCategoryId,
        unitId: pcsUnitId,
        purchasePrice: 800,
        sellingPrice: 1499,
        openingStock: 12,
      },
      user1Id,
    );

    // 1. Create Stocktake
    const stocktake = await stocktakeService.createStocktake(
      company1Id,
      {
        locationId: defaultLocation1Id,
        notes: 'Quarterly physical audit',
      },
      user1Id,
    );

    expect(stocktake.status).toBe('DRAFT');

    // 2. Start Stocktake
    const started = await stocktakeService.startStocktake(stocktake.id, user1Id);
    expect(started.status).toBe('IN_PROGRESS');

    // 3. Count shows only 10 items physically found (variance of -2)
    await stocktakeService.updateStocktake(
      stocktake.id,
      {
        items: [{ productId: product.id, countedQuantity: 10 }],
      },
      user1Id,
    );

    // 4. Complete stocktake
    const completed = await stocktakeService.completeStocktake(stocktake.id, user1Id);
    expect(completed.status).toBe('COMPLETED');

    // Check that STOCKTAKE_CORRECTION movement was posted
    const movements = await stockService.getStockMovements(company1Id, { productId: product.id });
    const corrMove = movements.items.find((m) => m.movementType === 'STOCKTAKE_CORRECTION');
    expect(corrMove).toBeDefined();
    expect(corrMove?.quantity).toBe(-2);

    // Final stock level should be 10
    const updatedSummary = await stockService.getProductStockSummary(company1Id, product.id);
    expect(updatedSummary.currentStock).toBe(10);
  });

  it('9. should reconcile ledger vs projection and repair discrepancies', async () => {
    const product = await productService.createProduct(
      company1Id,
      {
        name: 'Surge Protector 6-Way',
        sku: 'SRG-001',
        categoryId: defaultCategoryId,
        unitId: pcsUnitId,
        purchasePrice: 450,
        sellingPrice: 899,
        openingStock: 15,
      },
      user1Id,
    );

    // Intentionally simulate a corrupted projection by tampering with stock_balances directly
    await prisma.stockBalance.updateMany({
      where: { companyId: company1Id, productId: product.id, locationId: defaultLocation1Id },
      data: { quantity: 999 }, // Corrupted
    });

    // Reconcile -> Should detect discrepancy
    const reportBefore = await stockService.reconcileStock(company1Id);
    expect(reportBefore.discrepancyCount).toBeGreaterThanOrEqual(1);

    const corruptedItem = reportBefore.items.find((i) => i.productId === product.id);
    expect(corruptedItem?.isSynced).toBe(false);
    expect(corruptedItem?.ledgerBalance).toBe(15);
    expect(corruptedItem?.projectedBalance).toBe(999);

    // Auto-repair discrepancies
    const repairResult = await stockService.repairStockDiscrepancies(company1Id, user1Id);
    expect(repairResult.repairedCount).toBeGreaterThanOrEqual(1);

    // Reconcile again -> Should be 100% in sync
    const reportAfter = await stockService.reconcileStock(company1Id);
    const repairedItem = reportAfter.items.find((i) => i.productId === product.id);
    expect(repairedItem?.isSynced).toBe(true);
    expect(repairedItem?.projectedBalance).toBe(15);
  });

  it('10. should guarantee strict multi-company data isolation', async () => {
    // Company 2 product
    const prodCompany2 = await productService.createProduct(
      company2Id,
      {
        name: 'Beta Exclusive Gadget',
        sku: 'BET-001',
        categoryId: company2CategoryId,
        unitId: (await unitService.getUnits(company2Id)).find((u) => u.shortCode === 'PCS')!.id,
        purchasePrice: 500,
        sellingPrice: 1000,
        openingStock: 50,
      },
      user2Id,
    );

    // Company 1 queries current stock -> must NOT see Company 2 product
    const comp1Stock = await stockService.getCurrentStock(company1Id, { search: 'Beta Exclusive' });
    expect(comp1Stock.total).toBe(0);

    // Company 1 queries movements -> must NOT see Company 2 movements
    const comp1Movements = await stockService.getStockMovements(company1Id, { productId: prodCompany2.id });
    expect(comp1Movements.total).toBe(0);

    // Company 1 tries to adjust Company 2 product -> must throw error
    await expect(
      adjustmentService.createAdjustment(
        company1Id,
        {
          locationId: defaultLocation1Id,
          type: 'INCREASE',
          reason: 'Cross tenant test',
          items: [{ productId: prodCompany2.id, quantity: 5 }],
        },
        user1Id,
      ),
    ).rejects.toThrow();
  });
});
