import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDatabase } from '../helpers/test-db';
import { CompanyService } from '../../packages/business/src/services/company.service';
import { CategoryService } from '../../packages/business/src/services/category.service';
import { UnitService } from '../../packages/business/src/services/unit.service';
import { ProductService } from '../../packages/business/src/services/product.service';

describe('Product Master End-to-End & Isolation Integration Tests', () => {
  let cleanupFn: () => Promise<void>;
  let prisma: any;
  let companyService: CompanyService;
  let productService: ProductService;
  let categoryService: CategoryService;
  let unitService: UnitService;

  let company1Id: string;
  let user1Id: string;
  let category1Id: string;

  beforeAll(async () => {
    const { dbService, cleanup } = await createTestDatabase();
    cleanupFn = cleanup;
    prisma = dbService.getClient();

    companyService = new CompanyService(prisma);
    categoryService = new CategoryService(prisma);
    unitService = new UnitService(prisma);
    productService = new ProductService(prisma);

    const setup1 = await companyService.setupCompanyAndAdmin({
      businessName: 'Prime Retail Store 1',
      adminFullName: 'Admin One',
      adminUsername: 'admin1',
      adminPassword: 'Password123!',
      gstRegistered: true,
      gstin: '27AAAAA0000A1Z5',
    });

    company1Id = setup1.company.id;
    user1Id = setup1.user.id;

    const cat1 = await categoryService.createCategory(company1Id, { name: 'General Merchandise' }, user1Id);
    category1Id = cat1.id;
  });

  afterAll(async () => {
    if (cleanupFn) {
      await cleanupFn();
    }
  });

  it('should enforce decimal validation based on unit allowDecimals setting', async () => {
    const units = await unitService.getUnits(company1Id);
    const pcsUnit = units.find((u) => u.shortCode === 'PCS')!;
    const kgUnit = units.find((u) => u.shortCode === 'KG')!;

    // Non-decimal unit (PCS) with decimal opening stock should fail
    await expect(
      productService.createProduct(
        company1Id,
        {
          name: 'USB Cable 1M',
          categoryId: category1Id,
          unitId: pcsUnit.id,
          purchasePrice: 150,
          sellingPrice: 299,
          openingStock: 10.5, // Invalid fractional quantity for PCS
        },
        user1Id,
      ),
    ).rejects.toThrow('does not allow decimal quantities');

    // Decimal unit (KG) with decimal opening stock should succeed
    const basmatiRice = await productService.createProduct(
      company1Id,
      {
        name: 'Basmati Rice Premium',
        categoryId: category1Id,
        unitId: kgUnit.id,
        purchasePrice: 90,
        sellingPrice: 120,
        openingStock: 50.75, // Valid fractional quantity for KG
      },
      user1Id,
    );

    expect(basmatiRice.currentStock).toBe(50.75);
  });

  it('should correctly filter low stock products', async () => {
    const units = await unitService.getUnits(company1Id);
    const pcsUnit = units.find((u) => u.shortCode === 'PCS')!;

    // Create item with currentStock = 2, minimumStock = 10
    const lowStockItem = await productService.createProduct(
      company1Id,
      {
        name: 'Wireless Mouse',
        categoryId: category1Id,
        unitId: pcsUnit.id,
        purchasePrice: 300,
        sellingPrice: 450,
        trackStock: true,
        minimumStock: 10,
        openingStock: 2,
      },
      user1Id,
    );

    // Create normal item with currentStock = 50, minimumStock = 10
    await productService.createProduct(
      company1Id,
      {
        name: 'Keyboard Standard',
        categoryId: category1Id,
        unitId: pcsUnit.id,
        purchasePrice: 400,
        sellingPrice: 600,
        trackStock: true,
        minimumStock: 10,
        openingStock: 50,
      },
      user1Id,
    );

    const lowStockResult = await productService.getProducts(company1Id, {
      lowStock: true,
    });

    expect(lowStockResult.items.some((i) => i.id === lowStockItem.id)).toBe(true);
    expect(lowStockResult.items.some((i) => i.name === 'Keyboard Standard')).toBe(false);
  });

  it('should maintain strict multi-company data isolation', async () => {
    // Directly insert Company 2 to test multi-tenancy isolation
    const company2 = await prisma.company.create({
      data: {
        name: 'Secondary Retail Store 2',
        businessName: 'Secondary Retail Store 2',
        gstRegistered: false,
      },
    });

    // Auto-seed units for Company 2
    await unitService.seedDefaultUnits(company2.id);

    const comp2Units = await unitService.getUnits(company2.id);
    const comp2Pcs = comp2Units.find((u) => u.shortCode === 'PCS')!;

    const cat2 = await categoryService.createCategory(company2.id, { name: 'Comp2 Category' });

    // Company 2 creates a product with SKU "ISOLATION-SKU-001" and barcode "ISOLATION-BARCODE-001"
    const comp2Product = await productService.createProduct(
      company2.id,
      {
        name: 'Company 2 Product',
        sku: 'ISOLATION-SKU-001',
        barcode: 'ISOLATION-BARCODE-001',
        categoryId: cat2.id,
        unitId: comp2Pcs.id,
        purchasePrice: 10,
        sellingPrice: 20,
      },
      undefined,
    );

    expect(comp2Product).toBeDefined();

    // Company 1 should also be allowed to create product with the SAME SKU & barcode without collision
    const comp1Units = await unitService.getUnits(company1Id);
    const comp1Pcs = comp1Units.find((u) => u.shortCode === 'PCS')!;

    const comp1Product = await productService.createProduct(
      company1Id,
      {
        name: 'Company 1 Product',
        sku: 'ISOLATION-SKU-001',
        barcode: 'ISOLATION-BARCODE-001',
        categoryId: category1Id,
        unitId: comp1Pcs.id,
        purchasePrice: 15,
        sellingPrice: 30,
      },
      user1Id,
    );

    expect(comp1Product).toBeDefined();

    // Querying Company 1 products should NEVER return Company 2 items
    const comp1List = await productService.getProducts(company1Id, {});
    expect(comp1List.items.every((p) => p.companyId === company1Id)).toBe(true);
    expect(comp1List.items.some((p) => p.name === 'Company 2 Product')).toBe(false);

    // Finding barcode in Company 1 returns Company 1 item only
    const found1 = await productService.getProductByBarcode(company1Id, 'ISOLATION-BARCODE-001');
    expect(found1?.companyId).toBe(company1Id);
    expect(found1?.name).toBe('Company 1 Product');

    const found2 = await productService.getProductByBarcode(company2.id, 'ISOLATION-BARCODE-001');
    expect(found2?.companyId).toBe(company2.id);
    expect(found2?.name).toBe('Company 2 Product');
  });
});
