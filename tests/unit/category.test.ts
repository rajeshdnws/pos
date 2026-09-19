import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDatabase } from '../helpers/test-db';
import { CompanyService } from '../../packages/business/src/services/company.service';
import { CategoryService } from '../../packages/business/src/services/category.service';

describe('CategoryService Unit Tests', () => {
  let cleanupFn: () => Promise<void>;
  let companyService: CompanyService;
  let categoryService: CategoryService;
  let companyId: string;
  let userId: string;

  beforeAll(async () => {
    const { dbService, cleanup } = await createTestDatabase();
    cleanupFn = cleanup;
    const prisma = dbService.getClient();
    companyService = new CompanyService(prisma);
    categoryService = new CategoryService(prisma);

    const setupResult = await companyService.setupCompanyAndAdmin({
      businessName: 'Category Test Store',
      adminFullName: 'Cat Admin',
      adminUsername: 'catadmin',
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

  it('should create a new category and list it', async () => {
    const cat = await categoryService.createCategory(
      companyId,
      { name: 'Beverages', description: 'Cold and hot drinks' },
      userId,
    );

    expect(cat).toBeDefined();
    expect(cat.name).toBe('Beverages');
    expect(cat.description).toBe('Cold and hot drinks');
    expect(cat.companyId).toBe(companyId);
    expect(cat.isActive).toBe(true);

    const list = await categoryService.getCategories(companyId);
    expect(list.length).toBe(1);
    expect(list[0]!.name).toBe('Beverages');
  });

  it('should prevent duplicate category names within the same company', async () => {
    await expect(
      categoryService.createCategory(companyId, { name: 'Beverages' }, userId),
    ).rejects.toThrow('already exists');
  });

  it('should update an existing category', async () => {
    const list = await categoryService.getCategories(companyId);
    const catId = list[0]!.id;

    const updated = await categoryService.updateCategory(
      catId,
      { name: 'Soft Drinks & Beverages', description: 'All kinds of beverages' },
      userId,
    );

    expect(updated.name).toBe('Soft Drinks & Beverages');
    expect(updated.description).toBe('All kinds of beverages');
  });

  it('should toggle category active status', async () => {
    const list = await categoryService.getCategories(companyId);
    const catId = list[0]!.id;

    const deactivated = await categoryService.toggleCategoryActive(catId, userId);
    expect(deactivated.isActive).toBe(false);

    // Default list returns active only
    const activeList = await categoryService.getCategories(companyId, false);
    expect(activeList.length).toBe(0);

    // Full list with inactive
    const allList = await categoryService.getCategories(companyId, true);
    expect(allList.length).toBe(1);

    // Reactivate
    const reactivated = await categoryService.toggleCategoryActive(catId, userId);
    expect(reactivated.isActive).toBe(true);
  });
});
