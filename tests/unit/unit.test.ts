import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDatabase } from '../helpers/test-db';
import { CompanyService } from '../../packages/business/src/services/company.service';
import { UnitService } from '../../packages/business/src/services/unit.service';

describe('UnitService Unit Tests', () => {
  let cleanupFn: () => Promise<void>;
  let companyService: CompanyService;
  let unitService: UnitService;
  let companyId: string;
  let userId: string;

  beforeAll(async () => {
    const { dbService, cleanup } = await createTestDatabase();
    cleanupFn = cleanup;
    const prisma = dbService.getClient();
    companyService = new CompanyService(prisma);
    unitService = new UnitService(prisma);

    const setupResult = await companyService.setupCompanyAndAdmin({
      businessName: 'Unit Test Store',
      adminFullName: 'Unit Admin',
      adminUsername: 'unitadmin',
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

  it('should have standard units seeded automatically upon company setup', async () => {
    const units = await unitService.getUnits(companyId);
    expect(units.length).toBeGreaterThanOrEqual(6);

    const codes = units.map((u) => u.shortCode);
    expect(codes).toContain('PCS');
    expect(codes).toContain('KG');
    expect(codes).toContain('LTR');
    expect(codes).toContain('MTR');
    expect(codes).toContain('BOX');
    expect(codes).toContain('PKT');

    const kgUnit = units.find((u) => u.shortCode === 'KG');
    expect(kgUnit?.allowDecimals).toBe(true);

    const pcsUnit = units.find((u) => u.shortCode === 'PCS');
    expect(pcsUnit?.allowDecimals).toBe(false);
  });

  it('should allow creating a custom unit', async () => {
    const custom = await unitService.createUnit(
      companyId,
      {
        name: 'Roll',
        shortCode: 'ROL',
        allowDecimals: false,
      },
      userId,
    );

    expect(custom).toBeDefined();
    expect(custom.name).toBe('Roll');
    expect(custom.shortCode).toBe('ROL');
    expect(custom.allowDecimals).toBe(false);
  });

  it('should prevent duplicate unit short codes in the same company', async () => {
    await expect(
      unitService.createUnit(
        companyId,
        { name: 'Pieces Duplicate', shortCode: 'PCS', allowDecimals: false },
        userId,
      ),
    ).rejects.toThrow('already exists');
  });

  it('should toggle unit active status', async () => {
    const units = await unitService.getUnits(companyId);
    const rolUnit = units.find((u) => u.shortCode === 'ROL')!;

    const deactivated = await unitService.toggleUnitActive(rolUnit.id, userId);
    expect(deactivated.isActive).toBe(false);

    const activeUnits = await unitService.getUnits(companyId, false);
    expect(activeUnits.some((u) => u.shortCode === 'ROL')).toBe(false);

    const reactivated = await unitService.toggleUnitActive(rolUnit.id, userId);
    expect(reactivated.isActive).toBe(true);
  });
});
