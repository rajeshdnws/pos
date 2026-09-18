import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDatabase } from '../helpers/test-db';
import { CompanyService } from '../../packages/business/src/services/company.service';
import { UserService } from '../../packages/business/src/services/user.service';
import { AuthService } from '../../packages/business/src/services/auth.service';
import { CompanySetupDTO, UserCreateDTO } from '@rs-inventory/types';

describe('User Management Integration Tests', () => {
  let cleanupFn: () => Promise<void>;
  let userService: UserService;
  let companyService: CompanyService;
  let authService: AuthService;

  let companyId: string;
  let adminUserId: string;
  let managerRoleId: string;
  let cashierRoleId: string;

  beforeAll(async () => {
    const { dbService, cleanup } = await createTestDatabase();
    cleanupFn = cleanup;

    companyService = new CompanyService(dbService.getClient());
    userService = new UserService(dbService.getClient());
    authService = new AuthService(dbService.getClient());

    // Setup initial company and admin
    const setupDto: CompanySetupDTO = {
      businessName: 'Staff Management Store',
      adminFullName: 'Main Admin',
      adminUsername: 'main_admin',
      adminPassword: 'AdminPassword#2026',
      gstRegistered: false,
    };

    const setupRes = await companyService.setupCompanyAndAdmin(setupDto);
    companyId = setupRes.company.id;
    adminUserId = setupRes.user.id;

    const roles = await userService.getRoles();
    managerRoleId = roles.find((r) => r.name === 'MANAGER')!.id;
    cashierRoleId = roles.find((r) => r.name === 'CASHIER')!.id;
  });

  afterAll(async () => {
    if (cleanupFn) {
      await cleanupFn();
    }
  });

  it('should list all available roles and initial admin user', async () => {
    const users = await userService.listUsers(companyId);
    expect(users.length).toBe(1);
    expect(users[0]?.username).toBe('main_admin');
    expect(users[0]?.role?.name).toBe('ADMINISTRATOR');

    const roles = await userService.getRoles();
    expect(roles.length).toBe(3);
    const roleNames = roles.map((r) => r.name);
    expect(roleNames).toContain('ADMINISTRATOR');
    expect(roleNames).toContain('MANAGER');
    expect(roleNames).toContain('CASHIER');
  });

  it('should create new staff users with Manager and Cashier roles', async () => {
    const cashierDto: UserCreateDTO = {
      username: 'cashier_ramesh',
      name: 'Ramesh Kumar',
      password: 'CashierPass#123',
      roleId: cashierRoleId,
      mobile: '9876543210',
      email: 'ramesh@store.com',
      isActive: true,
    };

    const newCashier = await userService.createUser(companyId, cashierDto, adminUserId);
    expect(newCashier).toBeDefined();
    expect(newCashier.username).toBe('cashier_ramesh');
    expect(newCashier.role?.name).toBe('CASHIER');

    const managerDto: UserCreateDTO = {
      username: 'manager_suresh',
      name: 'Suresh Patil',
      password: 'ManagerPass#123',
      roleId: managerRoleId,
      mobile: '8123456789',
      isActive: true,
    };

    const newManager = await userService.createUser(companyId, managerDto, adminUserId);
    expect(newManager).toBeDefined();
    expect(newManager.username).toBe('manager_suresh');
    expect(newManager.role?.name).toBe('MANAGER');

    const userList = await userService.listUsers(companyId);
    expect(userList.length).toBe(3);
  });

  it('should reject duplicate username', async () => {
    const duplicateDto: UserCreateDTO = {
      username: 'cashier_ramesh', // already taken
      name: 'Another Ramesh',
      password: 'Password#2026',
      roleId: cashierRoleId,
    };

    await expect(userService.createUser(companyId, duplicateDto, adminUserId)).rejects.toThrow(
      "Username 'cashier_ramesh' is already taken.",
    );
  });

  it('should reject user creation with weak password', async () => {
    const weakUserDto: UserCreateDTO = {
      username: 'new_staff',
      name: 'New Staff',
      password: 'weak',
      roleId: cashierRoleId,
    };

    await expect(userService.createUser(companyId, weakUserDto, adminUserId)).rejects.toThrow(
      'Password must be at least 8 characters long.',
    );
  });

  it('should update user profile details', async () => {
    const users = await userService.listUsers(companyId);
    const cashier = users.find((u) => u.username === 'cashier_ramesh');
    expect(cashier).toBeDefined();

    const updated = await userService.updateUser(
      cashier!.id,
      {
        name: 'Ramesh K. (Senior Cashier)',
        mobile: '9988776655',
      },
      adminUserId,
    );

    expect(updated.name).toBe('Ramesh K. (Senior Cashier)');
    expect(updated.mobile).toBe('9988776655');
  });

  it('should toggle active state for non-admin staff users', async () => {
    const users = await userService.listUsers(companyId);
    const cashier = users.find((u) => u.username === 'cashier_ramesh');
    expect(cashier?.isActive).toBe(true);

    // Deactivate
    const deactivated = await userService.toggleUserActive(cashier!.id, adminUserId);
    expect(deactivated.isActive).toBe(false);

    // Verify login is rejected when deactivated
    await expect(
      authService.login({
        username: 'cashier_ramesh',
        password: 'CashierPass#123',
      }),
    ).rejects.toThrow('This account has been deactivated.');

    // Reactivate
    const reactivated = await userService.toggleUserActive(cashier!.id, adminUserId);
    expect(reactivated.isActive).toBe(true);
  });

  it('should prevent deactivating the last active Administrator account', async () => {
    // There is only 1 administrator (adminUserId)
    await expect(userService.toggleUserActive(adminUserId, adminUserId)).rejects.toThrow(
      'Cannot deactivate the last active Administrator account.',
    );
  });

  it('should allow reset of user password by administrator', async () => {
    const users = await userService.listUsers(companyId);
    const cashier = users.find((u) => u.username === 'cashier_ramesh');
    expect(cashier).toBeDefined();

    // Reset password
    await userService.resetPassword(cashier!.id, 'ResetPassword#999', adminUserId);

    // Verify login works with the new reset password
    const loginRes = await authService.login({
      username: 'cashier_ramesh',
      password: 'ResetPassword#999',
    });

    expect(loginRes.user.username).toBe('cashier_ramesh');
    expect(loginRes.permissions.length).toBe(7); // Cashier has 7 permissions
  });
});
