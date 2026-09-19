import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDatabase } from '../helpers/test-db';
import { CompanyService } from '../../packages/business/src/services/company.service';
import { DemoDataService } from '../../packages/business/src/services/demo-data.service';
import { StockService } from '../../packages/business/src/services/stock.service';
import { ProductService } from '../../packages/business/src/services/product.service';

describe('Demo Data Management Integration Tests', () => {
  let cleanupFn: () => Promise<void>;
  let prisma: any;
  let companyService: CompanyService;
  let demoDataService: DemoDataService;
  let stockService: StockService;
  let productService: ProductService;

  let companyId: string;
  let adminUserId: string;

  beforeAll(async () => {
    const { dbService, cleanup } = await createTestDatabase();
    cleanupFn = cleanup;
    prisma = dbService.getClient();

    companyService = new CompanyService(prisma);
    demoDataService = new DemoDataService(prisma);
    stockService = new StockService(prisma);
    productService = new ProductService(prisma);

    const setup = await companyService.setupCompanyAndAdmin({
      businessName: 'Sharma Supermarket',
      adminFullName: 'Sharma Admin',
      adminUsername: 'sharma_admin',
      adminPassword: 'Password123!',
      gstRegistered: true,
      gstin: '27AABCU9603R1ZM',
    });
    companyId = setup.company.id;
    adminUserId = setup.user.id;
  });

  afterAll(async () => {
    if (cleanupFn) {
      await cleanupFn();
    }
  });

  it('1. should report no demo data before installation', async () => {
    const status = await demoDataService.getDemoDataStatus(companyId);
    expect(status.hasDemoData).toBe(false);
    expect(status.demoProductsCount).toBe(0);
    expect(status.demoMovementsCount).toBe(0);
  });

  it('2. should install demo dataset including categories, brands, products, movements, and transfers', async () => {
    const result = await demoDataService.installDemoData(companyId, adminUserId);

    expect(result.success).toBe(true);
    expect(result.productsCreated).toBe(16);
    expect(result.categoriesCreated).toBe(6);
    expect(result.brandsCreated).toBe(8);
    expect(result.locationsCreated).toBe(2);
    expect(result.movementsCreated).toBeGreaterThanOrEqual(16);
    expect(result.adjustmentsCreated).toBe(2);
    expect(result.transfersCreated).toBe(1);
    expect(result.stocktakesCreated).toBe(1);

    // Verify Demo Status
    const status = await demoDataService.getDemoDataStatus(companyId);
    expect(status.hasDemoData).toBe(true);
    expect(status.demoProductsCount).toBe(16);
    expect(status.demoCategoriesCount).toBe(6);
    expect(status.demoBrandsCount).toBe(8);

    // Verify stock valuation
    const valuation = await stockService.getInventoryValuation(companyId);
    expect(valuation.totalItems).toBe(16);
    expect(valuation.totalQuantity).toBeGreaterThan(0);
    expect(valuation.totalCostValuation).toBeGreaterThan(0);
    expect(valuation.byCategory.length).toBeGreaterThanOrEqual(6);
  });

  it('3. should search demo products by standard barcode and SKU', async () => {
    const prodByBarcode = await productService.getProductByBarcode(companyId, '8901030382910');
    expect(prodByBarcode).not.toBeNull();
    expect(prodByBarcode?.name).toBe('Tata Tea Gold 500g');
    expect(prodByBarcode?.sku).toBe('DEMO-BEV-001');

    const searchResults = await productService.searchProducts(companyId, 'Maggi');
    expect(searchResults.length).toBeGreaterThanOrEqual(1);
    expect(searchResults[0]?.name).toContain('Maggi');
  });

  it('4. should safely clear demo data without affecting company profile and admin user', async () => {
    const clearResult = await demoDataService.clearDemoData(companyId, adminUserId);

    expect(clearResult.success).toBe(true);
    expect(clearResult.productsDeleted).toBe(16);
    expect(clearResult.movementsDeleted).toBeGreaterThanOrEqual(16);

    // Verify Demo Status is back to clean state
    const status = await demoDataService.getDemoDataStatus(companyId);
    expect(status.hasDemoData).toBe(false);
    expect(status.demoProductsCount).toBe(0);
    expect(status.demoMovementsCount).toBe(0);

    // Verify company profile and admin user still exist
    const activeCompany = await companyService.getCompany();
    expect(activeCompany).not.toBeNull();
    expect(activeCompany?.name).toBe('Sharma Supermarket');

    const adminUser = await prisma.user.findUnique({
      where: { id: adminUserId },
    });
    expect(adminUser).not.toBeNull();
    expect(adminUser?.username).toBe('sharma_admin');
  });

  it('5. should allow re-installing demo data after clearing idempotently', async () => {
    const reinstallResult = await demoDataService.installDemoData(companyId, adminUserId);
    expect(reinstallResult.success).toBe(true);
    expect(reinstallResult.productsCreated).toBe(16);

    const status = await demoDataService.getDemoDataStatus(companyId);
    expect(status.hasDemoData).toBe(true);
    expect(status.demoProductsCount).toBe(16);
  });
});
