import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDatabase } from '../helpers/test-db';
import { CompanyService } from '../../packages/business/src/services/company.service';
import { BrandService } from '../../packages/business/src/services/brand.service';

describe('BrandService Unit Tests', () => {
  let cleanupFn: () => Promise<void>;
  let companyService: CompanyService;
  let brandService: BrandService;
  let companyId: string;
  let userId: string;

  beforeAll(async () => {
    const { dbService, cleanup } = await createTestDatabase();
    cleanupFn = cleanup;
    const prisma = dbService.getClient();
    companyService = new CompanyService(prisma);
    brandService = new BrandService(prisma);

    const setupResult = await companyService.setupCompanyAndAdmin({
      businessName: 'Brand Test Store',
      adminFullName: 'Brand Admin',
      adminUsername: 'brandadmin',
      adminPassword: 'Password123!',
      gstRegistered: false,
    });

    companyId = setupResult.company.id;
    userId = setupResult.user.id;
  });

  afterAll(async () => {
    if (cleanupFn) {
      await cleanupFn();
    }
  });

  it('should create a brand and list it', async () => {
    const brand = await brandService.createBrand(
      companyId,
      { name: 'Nestle', description: 'Food and beverage manufacturer' },
      userId,
    );

    expect(brand).toBeDefined();
    expect(brand.name).toBe('Nestle');
    expect(brand.description).toBe('Food and beverage manufacturer');
    expect(brand.isActive).toBe(true);

    const list = await brandService.getBrands(companyId);
    expect(list.length).toBe(1);
    expect(list[0]!.name).toBe('Nestle');
  });

  it('should prevent duplicate brand names in the same company', async () => {
    await expect(
      brandService.createBrand(companyId, { name: 'Nestle' }, userId),
    ).rejects.toThrow('already exists');
  });

  it('should update a brand', async () => {
    const list = await brandService.getBrands(companyId);
    const brandId = list[0]!.id;

    const updated = await brandService.updateBrand(
      brandId,
      { name: 'Nestlé India', description: 'Nestle subsidiary in India' },
      userId,
    );

    expect(updated.name).toBe('Nestlé India');
    expect(updated.description).toBe('Nestle subsidiary in India');
  });

  it('should toggle brand status', async () => {
    const list = await brandService.getBrands(companyId);
    const brandId = list[0]!.id;

    const deactivated = await brandService.toggleBrandActive(brandId, userId);
    expect(deactivated.isActive).toBe(false);

    const activeList = await brandService.getBrands(companyId, false);
    expect(activeList.length).toBe(0);

    const allList = await brandService.getBrands(companyId, true);
    expect(allList.length).toBe(1);

    const reactivated = await brandService.toggleBrandActive(brandId, userId);
    expect(reactivated.isActive).toBe(true);
  });
});
