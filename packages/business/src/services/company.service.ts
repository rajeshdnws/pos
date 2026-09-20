import { PrismaClient } from '@prisma/client';
import { Company, CompanySetupDTO, LoginResponseDTO, User } from '@rs-inventory/types';
import { BusinessRuleError, ValidationError } from '../errors/app.error.js';
import { PasswordService } from '../utils/password.js';
import { ValidationUtils } from '../utils/validation.js';
import { DEFAULT_APP_SETTINGS } from './settings.service.js';
import { ROLE_PERMISSION_MAP, SYSTEM_PERMISSIONS } from './permission.service.js';
import { DEFAULT_EXPENSE_CATEGORIES } from './expense-category.service.js';

export class CompanyService {
  constructor(private readonly prisma: PrismaClient) {}

  public async hasCompany(): Promise<boolean> {
    const count = await this.prisma.company.count({
      where: { isActive: true },
    });
    return count > 0;
  }

  public async getCompany(): Promise<Company | null> {
    const company = await this.prisma.company.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return company as unknown as Company | null;
  }

  /**
   * Performs atomic first-run setup in a single database transaction:
   * Company + Administrator User + Default Roles + Permissions + Settings + Audit
   */
  public async setupCompanyAndAdmin(dto: CompanySetupDTO): Promise<LoginResponseDTO> {
    // 1. Validations
    if (!dto.businessName || dto.businessName.trim().length === 0) {
      throw new ValidationError('Business Name is required.');
    }
    if (!dto.adminFullName || dto.adminFullName.trim().length === 0) {
      throw new ValidationError('Administrator Full Name is required.');
    }
    if (!dto.adminUsername || dto.adminUsername.trim().length < 3) {
      throw new ValidationError('Administrator Username must be at least 3 characters.');
    }

    const passwordCheck = PasswordService.validatePasswordPolicy(dto.adminPassword);
    if (!passwordCheck.valid) {
      throw new ValidationError(
        passwordCheck.message || 'Password does not meet policy requirements.',
      );
    }

    if (dto.gstRegistered && dto.gstin) {
      if (!ValidationUtils.isValidGSTIN(dto.gstin)) {
        throw new ValidationError('Invalid GSTIN format. Expected 15-character Indian GSTIN.');
      }
    }

    if (dto.email && !ValidationUtils.isValidEmail(dto.email)) {
      throw new ValidationError('Invalid business email address.');
    }
    if (dto.adminEmail && !ValidationUtils.isValidEmail(dto.adminEmail)) {
      throw new ValidationError('Invalid administrator email address.');
    }

    // 2. Atomic Transaction Execution
    return await this.prisma.$transaction(async (tx) => {
      // Ensure no company exists yet
      const existing = await tx.company.count({ where: { isActive: true } });
      if (existing > 0) {
        throw new BusinessRuleError('Company setup has already been completed.');
      }

      // 2a. Seed Permissions
      for (const perm of SYSTEM_PERMISSIONS) {
        await tx.permission.upsert({
          where: { code: perm.code },
          update: { name: perm.name, description: perm.description, module: perm.module },
          create: {
            code: perm.code,
            name: perm.name,
            description: perm.description,
            module: perm.module,
          },
        });
      }

      const allDbPermissions = await tx.permission.findMany();
      const permMap = new Map(allDbPermissions.map((p) => [p.code, p.id]));

      // 2b. Seed Roles & RolePermissions
      const roleDefs = [
        { name: 'ADMINISTRATOR', desc: 'Full system access and administration', isSys: true },
        {
          name: 'MANAGER',
          desc: 'Operations and inventory management without user admin',
          isSys: true,
        },
        { name: 'CASHIER', desc: 'Point of sale billing and customer lookup', isSys: true },
      ];

      const rolesCreated = new Map<string, string>();
      for (const r of roleDefs) {
        const roleRecord = await tx.role.upsert({
          where: { name: r.name },
          update: { description: r.desc, isSystemRole: r.isSys },
          create: { name: r.name, description: r.desc, isSystemRole: r.isSys },
        });
        rolesCreated.set(r.name, roleRecord.id);

        // Link role permissions
        const targetPermCodes =
          ROLE_PERMISSION_MAP[r.name as keyof typeof ROLE_PERMISSION_MAP] || [];
        for (const code of targetPermCodes) {
          const permId = permMap.get(code);
          if (permId) {
            await tx.rolePermission.upsert({
              where: {
                roleId_permissionId: {
                  roleId: roleRecord.id,
                  permissionId: permId,
                },
              },
              update: {},
              create: {
                roleId: roleRecord.id,
                permissionId: permId,
              },
            });
          }
        }
      }

      const adminRoleId = rolesCreated.get('ADMINISTRATOR');
      if (!adminRoleId) {
        throw new Error('Failed to initialize administrator role.');
      }

      // 2c. Create Company
      const cleanBusinessName = dto.businessName.trim();
      const companyRecord = await tx.company.create({
        data: {
          name: cleanBusinessName,
          businessName: cleanBusinessName,
          businessType: dto.businessType || 'Retail Shop',
          ownerName: dto.ownerName?.trim() || null,
          mobile: dto.mobile?.trim() || null,
          phone: dto.mobile?.trim() || null,
          email: dto.email?.trim() || null,
          address: dto.address?.trim() || null,
          city: dto.city?.trim() || null,
          state: dto.state?.trim() || null,
          pincode: dto.pincode?.trim() || null,
          country: dto.country?.trim() || 'India',
          gstRegistered: Boolean(dto.gstRegistered),
          gstin: dto.gstRegistered && dto.gstin ? dto.gstin.trim().toUpperCase() : null,
          pan: dto.pan ? dto.pan.trim().toUpperCase() : null,
          taxType: dto.taxType || (dto.gstRegistered ? 'GST_REGISTERED' : 'UNREGISTERED'),
          invoicePrefix: dto.invoicePrefix?.trim() || 'INV',
          startingInvoiceNumber: Number(dto.startingInvoiceNumber) || 1,
          financialYearStart: dto.financialYearStart ? new Date(dto.financialYearStart) : null,
          financialYearEnd: dto.financialYearEnd ? new Date(dto.financialYearEnd) : null,
          currency: 'INR',
          isActive: true,
        },
      });

      // 2d. Hash Password & Create Administrator User
      const passwordHash = await PasswordService.hashPassword(dto.adminPassword);
      const adminUser = await tx.user.create({
        data: {
          companyId: companyRecord.id,
          name: dto.adminFullName.trim(),
          username: dto.adminUsername.trim().toLowerCase(),
          email: dto.adminEmail?.trim() || null,
          mobile: dto.adminMobile?.trim() || null,
          passwordHash,
          roleId: adminRoleId,
          isActive: true,
          lastLoginAt: new Date(),
        },
      });

      // 2e. Seed Default Company Settings
      for (const [key, value] of Object.entries(DEFAULT_APP_SETTINGS)) {
        await tx.setting.create({
          data: {
            companyId: companyRecord.id,
            key,
            value,
            type: 'STRING',
          },
        });
      }

      // 2e-ii. Seed Standard Units
      const defaultUnits = [
        { name: 'Piece', shortCode: 'PCS', allowDecimals: false },
        { name: 'Kilogram', shortCode: 'KG', allowDecimals: true },
        { name: 'Gram', shortCode: 'GM', allowDecimals: true },
        { name: 'Liter', shortCode: 'LTR', allowDecimals: true },
        { name: 'Milliliter', shortCode: 'ML', allowDecimals: true },
        { name: 'Meter', shortCode: 'MTR', allowDecimals: true },
        { name: 'Box', shortCode: 'BOX', allowDecimals: false },
        { name: 'Dozen', shortCode: 'DOZ', allowDecimals: false },
        { name: 'Packet', shortCode: 'PKT', allowDecimals: false },
        { name: 'Bottle', shortCode: 'BTL', allowDecimals: false },
      ];
      for (const u of defaultUnits) {
        await tx.unit.create({
          data: {
            companyId: companyRecord.id,
            name: u.name,
            shortCode: u.shortCode,
            allowDecimals: u.allowDecimals,
            isActive: true,
          },
        });
      }

      // 2e-iii. Seed Default Main Store Location
      await tx.inventoryLocation.create({
        data: {
          companyId: companyRecord.id,
          name: 'Main Store',
          code: 'MAIN',
          description: 'Primary store and main stock holding location',
          locationType: 'STORE',
          isDefault: true,
          isActive: true,
        },
      });

      // 2e-iv. Seed Default Cash Register
      await tx.cashRegister.create({
        data: {
          companyId: companyRecord.id,
          registerCode: 'REG-MAIN',
          name: 'Main Counter',
          isActive: true,
        },
      });

      // 2e-v. Seed Default Expense Categories
      for (const catName of DEFAULT_EXPENSE_CATEGORIES) {
        await tx.expenseCategory.create({
          data: {
            companyId: companyRecord.id,
            name: catName,
            isActive: true,
            createdBy: adminUser.id,
          },
        });
      }

      // 2f. Record Audit Log
      await tx.auditLog.create({
        data: {
          companyId: companyRecord.id,
          userId: adminUser.id,
          action: 'SETUP_COMPLETED',
          module: 'COMPANY',
          referenceId: companyRecord.id,
          newValue: JSON.stringify({
            businessName: companyRecord.businessName,
            adminUsername: adminUser.username,
          }),
          ipAddress: '127.0.0.1',
        },
      });

      // 2g. Return login session payload
      const adminRole = await tx.role.findUnique({
        where: { id: adminRoleId },
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      });

      const permissions = adminRole?.permissions.map((p) => p.permission.code) || [];
      const sessionToken = `solo-sess-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      return {
        user: {
          ...adminUser,
          role: adminRole
            ? { id: adminRole.id, name: adminRole.name, isSystemRole: adminRole.isSystemRole }
            : null,
        } as unknown as User,
        sessionToken,
        permissions,
        company: companyRecord as unknown as Company,
      };
    }, { maxWait: 15000, timeout: 30000 });
  }

  public async updateCompany(companyId: string, updates: Partial<Company>): Promise<Company> {
    const existing = await this.prisma.company.findUnique({
      where: { id: companyId },
    });
    if (!existing) {
      throw new BusinessRuleError('Company not found.');
    }

    if (updates.gstRegistered && updates.gstin) {
      if (!ValidationUtils.isValidGSTIN(updates.gstin)) {
        throw new ValidationError('Invalid GSTIN format.');
      }
    }

    const updated = await this.prisma.company.update({
      where: { id: companyId },
      data: {
        businessName: updates.businessName ?? updates.name ?? existing.businessName,
        name: updates.businessName ?? updates.name ?? existing.name,
        businessType: updates.businessType ?? existing.businessType,
        ownerName: updates.ownerName ?? existing.ownerName,
        phone: updates.phone ?? updates.mobile ?? existing.phone,
        mobile: updates.mobile ?? updates.phone ?? existing.mobile,
        email: updates.email ?? existing.email,
        address: updates.address ?? existing.address,
        city: updates.city ?? existing.city,
        state: updates.state ?? existing.state,
        pincode: updates.pincode ?? existing.pincode,
        gstRegistered: updates.gstRegistered ?? existing.gstRegistered,
        gstin: updates.gstin ? updates.gstin.trim().toUpperCase() : existing.gstin,
        pan: updates.pan ? updates.pan.trim().toUpperCase() : existing.pan,
        taxType: updates.taxType ?? existing.taxType,
        invoicePrefix: updates.invoicePrefix ?? existing.invoicePrefix,
        logoPath: updates.logoPath ?? existing.logoPath,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        companyId,
        action: 'COMPANY_UPDATED',
        module: 'COMPANY',
        referenceId: companyId,
        oldValue: JSON.stringify({ businessName: existing.businessName, gstin: existing.gstin }),
        newValue: JSON.stringify({ businessName: updated.businessName, gstin: updated.gstin }),
        ipAddress: '127.0.0.1',
      },
    });

    return updated as unknown as Company;
  }
}
