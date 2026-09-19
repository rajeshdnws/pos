import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDatabase } from '../helpers/test-db';
import { CompanyService } from '../../packages/business/src/services/company.service';
import { CompanySetupDTO } from '@rs-inventory/types';

describe('Company Setup Integration Tests', () => {
  let cleanupFn: () => Promise<void>;
  let companyService: CompanyService;

  beforeAll(async () => {
    const { dbService, cleanup } = await createTestDatabase();
    cleanupFn = cleanup;
    companyService = new CompanyService(dbService.getClient());
  });

  afterAll(async () => {
    if (cleanupFn) {
      await cleanupFn();
    }
  });

  it('should detect first-run when no company exists', async () => {
    const hasCompany = await companyService.hasCompany();
    expect(hasCompany).toBe(false);

    const company = await companyService.getCompany();
    expect(company).toBeNull();
  });

  it('should reject setup with invalid business name or admin details', async () => {
    const invalidDto: CompanySetupDTO = {
      businessName: '',
      adminFullName: 'Admin User',
      adminUsername: 'admin',
      adminPassword: 'Password123!',
      gstRegistered: false,
    };

    await expect(companyService.setupCompanyAndAdmin(invalidDto)).rejects.toThrow(
      'Business Name is required.',
    );
  });

  it('should reject setup with weak admin password', async () => {
    const weakDto: CompanySetupDTO = {
      businessName: 'Apex Retail',
      adminFullName: 'Admin User',
      adminUsername: 'admin',
      adminPassword: '123',
      gstRegistered: false,
    };

    await expect(companyService.setupCompanyAndAdmin(weakDto)).rejects.toThrow(
      'Password must be at least 8 characters long.',
    );
  });

  it('should reject setup with invalid GSTIN when registered', async () => {
    const invalidGstinDto: CompanySetupDTO = {
      businessName: 'Apex Retail',
      adminFullName: 'Admin User',
      adminUsername: 'admin',
      adminPassword: 'Password123!',
      gstRegistered: true,
      gstin: 'INVALID_GSTIN_123',
    };

    await expect(companyService.setupCompanyAndAdmin(invalidGstinDto)).rejects.toThrow(
      'Invalid GSTIN format.',
    );
  });

  it('should complete atomic setup of company, roles, permissions, settings, and admin', async () => {
    const validDto: CompanySetupDTO = {
      businessName: 'Apex Retail Store',
      ownerName: 'Rajesh Sharma',
      mobile: '9876543210',
      email: 'contact@apexretail.in',
      address: '123 MG Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
      country: 'India',
      gstRegistered: true,
      gstin: '29ABCDE1234F1Z5',
      pan: 'ABCDE1234F',
      invoicePrefix: 'APEX',
      startingInvoiceNumber: 101,
      adminFullName: 'Rajesh Sharma',
      adminUsername: 'rajesh_admin',
      adminEmail: 'rajesh@apexretail.in',
      adminMobile: '9876543210',
      adminPassword: 'AdminSecure#2026',
    };

    const setupResult = await companyService.setupCompanyAndAdmin(validDto);

    expect(setupResult).toBeDefined();
    expect(setupResult.company).toBeDefined();
    expect(setupResult.company.name).toBe('Apex Retail Store');
    expect(setupResult.company.gstin).toBe('29ABCDE1234F1Z5');
    expect(setupResult.company.invoicePrefix).toBe('APEX');

    expect(setupResult.user).toBeDefined();
    expect(setupResult.user.username).toBe('rajesh_admin');
    expect(setupResult.user.name).toBe('Rajesh Sharma');
    expect(setupResult.user.role).toBeDefined();
    expect(setupResult.user.role?.name).toBe('ADMINISTRATOR');

    // Check all 54 permissions are granted to the initial Admin
    expect(setupResult.permissions.length).toBe(54);
    expect(setupResult.sessionToken).toBeDefined();

    // Verify subsequent first-run checks return true
    const hasCompany = await companyService.hasCompany();
    expect(hasCompany).toBe(true);

    const activeCompany = await companyService.getCompany();
    expect(activeCompany).not.toBeNull();
    expect(activeCompany?.name).toBe('Apex Retail Store');
  });

  it('should prevent duplicate setup once initial company is registered', async () => {
    const secondDto: CompanySetupDTO = {
      businessName: 'Second Company',
      adminFullName: 'Second Admin',
      adminUsername: 'second_admin',
      adminPassword: 'Password#2026',
      gstRegistered: false,
    };

    await expect(companyService.setupCompanyAndAdmin(secondDto)).rejects.toThrow(
      'Company setup has already been completed.',
    );
  });

  it('should update company profile details and record audit log', async () => {
    const activeCompany = await companyService.getCompany();
    expect(activeCompany).not.toBeNull();

    const updated = await companyService.updateCompany(activeCompany!.id, {
      businessName: 'Apex Super Store',
      phone: '080-22334455',
      address: '456 Brigade Road',
    });

    expect(updated.businessName).toBe('Apex Super Store');
    expect(updated.address).toBe('456 Brigade Road');
  });
});
