import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDatabase } from '../helpers/test-db';
import { CompanyService } from '../../packages/business/src/services/company.service';
import { CategoryService } from '../../packages/business/src/services/category.service';
import { UnitService } from '../../packages/business/src/services/unit.service';
import { BrandService } from '../../packages/business/src/services/brand.service';
import { ProductService } from '../../packages/business/src/services/product.service';

describe('ProductService Unit Tests', () => {
  let cleanupFn: () => Promise<void>;
  let companyService: CompanyService;
  let productService: ProductService;
  let categoryService: CategoryService;
  let unitService: UnitService;
  let brandService: BrandService;

  let companyId: string;
  let userId: string;
  let categoryId: string;
  let brandId: string;
  let unitPcsId: string;

  beforeAll(async () => {
    const { dbService, cleanup } = await createTestDatabase();
    cleanupFn = cleanup;
    const prisma = dbService.getClient();

    companyService = new CompanyService(prisma);
    categoryService = new CategoryService(prisma);
    unitService = new UnitService(prisma);
    brandService = new BrandService(prisma);
    productService = new ProductService(prisma);

    const setupResult = await companyService.setupCompanyAndAdmin({
      businessName: 'Product Master Store',
      adminFullName: 'Product Admin',
      adminUsername: 'prodadmin',
      adminPassword: 'Password123!',
      gstRegistered: true,
      gstin: '29AABCS1429B1ZB',
    });

    companyId = setupResult.company.id;
    userId = setupResult.user.id;

    // Create Category & Brand
    const cat = await categoryService.createCategory(companyId, { name: 'Dairy & Grocery' }, userId);
    categoryId = cat.id;

    const brand = await brandService.createBrand(companyId, { name: 'Amul' }, userId);
    brandId = brand.id;

    const units = await unitService.getUnits(companyId);
    const pcsUnit = units.find((u) => u.shortCode === 'PCS')!;
    unitPcsId = pcsUnit.id;
  });

  afterAll(async () => {
    if (cleanupFn) {
      await cleanupFn();
    }
  });

  it('should auto-generate SKU if not provided', async () => {
    const nextSku = await productService.generateSku(companyId);
    expect(nextSku).toBe('PROD-000001');
  });

  it('should create a new product and track opening stock', async () => {
    const product = await productService.createProduct(
      companyId,
      {
        name: 'Amul Salted Butter 500g',
        shortName: 'Amul Butter 500g',
        barcode: '8901262010052',
        categoryId,
        brandId,
        unitId: unitPcsId,
        purchasePrice: 240,
        sellingPrice: 275,
        mrp: 275,
        taxRate: 12,
        hsnCode: '04051000',
        trackStock: true,
        minimumStock: 10,
        maximumStock: 100,
        openingStock: 25,
        openingStockRate: 240,
      },
      userId,
    );

    expect(product).toBeDefined();
    expect(product.name).toBe('Amul Salted Butter 500g');
    expect(product.sku).toBe('PROD-000001');
    expect(product.barcode).toBe('8901262010052');
    expect(product.sellingPrice).toBe(275);
    expect(product.purchasePrice).toBe(240);
    expect(product.mrp).toBe(275);
    expect(product.taxRate).toBe(12);
    expect(product.currentStock).toBe(25);
  });

  it('should reject creating duplicate barcode or duplicate SKU in the same company', async () => {
    await expect(
      productService.createProduct(
        companyId,
        {
          name: 'Another Butter',
          barcode: '8901262010052', // Duplicate barcode
          categoryId,
          unitId: unitPcsId,
          purchasePrice: 100,
          sellingPrice: 120,
        },
        userId,
      ),
    ).rejects.toThrow('already exists');

    await expect(
      productService.createProduct(
        companyId,
        {
          name: 'Another Butter 2',
          sku: 'PROD-000001', // Duplicate SKU
          categoryId,
          unitId: unitPcsId,
          purchasePrice: 100,
          sellingPrice: 120,
        },
        userId,
      ),
    ).rejects.toThrow('already exists');
  });

  it('should update prices and record price history audit entry', async () => {
    const product = await productService.getProductByBarcode(companyId, '8901262010052');
    expect(product).not.toBeNull();

    const updated = await productService.updateProduct(
      product!.id,
      {
        sellingPrice: 285,
        mrp: 290,
        purchasePrice: 250,
      },
      userId,
    );

    expect(updated.sellingPrice).toBe(285);
    expect(updated.mrp).toBe(290);
    expect(updated.purchasePrice).toBe(250);

    const priceHistory = await productService.getPriceHistory(product!.id);
    expect(priceHistory.length).toBe(2);
    // Most recent history entry is first (descending order)
    expect(priceHistory[0]!.oldSellingPrice).toBe(275);
    expect(priceHistory[0]!.newSellingPrice).toBe(285);
    expect(priceHistory[0]!.oldPurchasePrice).toBe(240);
    expect(priceHistory[0]!.newPurchasePrice).toBe(250);
  });

  it('should perform multi-field search and pagination', async () => {
    // Add a second product
    await productService.createProduct(
      companyId,
      {
        name: 'Amul Taaza Milk 1L',
        barcode: '8901262020013',
        unitId: unitPcsId,
        categoryId,
        brandId,
        purchasePrice: 65,
        sellingPrice: 72,
        taxRate: 5,
      },
      userId,
    );

    // Search by text "Milk"
    const searchResult = await productService.getProducts(companyId, {
      search: 'Milk',
      page: 1,
      pageSize: 10,
    });
    expect(searchResult.total).toBe(1);
    expect(searchResult.items[0]!.name).toBe('Amul Taaza Milk 1L');

    // Search by category
    const catResult = await productService.getProducts(companyId, {
      categoryId,
      page: 1,
      pageSize: 10,
    });
    expect(catResult.total).toBe(2);

    // Search by tax rate 5%
    const taxResult = await productService.getProducts(companyId, {
      taxRate: 5,
    });
    expect(taxResult.total).toBe(1);
    expect(taxResult.items[0]!.name).toBe('Amul Taaza Milk 1L');
  });

  it('should toggle product active status', async () => {
    const product = await productService.getProductByBarcode(companyId, '8901262020013');
    expect(product).not.toBeNull();

    const deactivated = await productService.toggleProductActive(product!.id, userId);
    expect(deactivated.isActive).toBe(false);

    // Filter active only
    const activeOnly = await productService.getProducts(companyId, { isActive: true });
    expect(activeOnly.items.some((p) => p.id === product!.id)).toBe(false);

    // Reactivate
    const reactivated = await productService.toggleProductActive(product!.id, userId);
    expect(reactivated.isActive).toBe(true);
  });
});
