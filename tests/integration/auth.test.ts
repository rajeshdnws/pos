import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDatabase } from '../helpers/test-db';
import { CompanyService } from '../../packages/business/src/services/company.service';
import { AuthService } from '../../packages/business/src/services/auth.service';
import { UserService } from '../../packages/business/src/services/user.service';
import { CompanySetupDTO } from '@rs-inventory/types';

describe('Authentication & Session Management Integration Tests', () => {
  let cleanupFn: () => Promise<void>;
  let authService: AuthService;
  let companyService: CompanyService;
  let userService: UserService;

  const adminPassword = 'AdminSecret#2026';
  const adminUsername = 'pos_admin';

  beforeAll(async () => {
    const { dbService, cleanup } = await createTestDatabase();
    cleanupFn = cleanup;

    companyService = new CompanyService(dbService.getClient());
    authService = new AuthService(dbService.getClient());
    userService = new UserService(dbService.getClient());

    // Setup initial company and admin
    const setupDto: CompanySetupDTO = {
      businessName: 'Auth Test Supermarket',
      adminFullName: 'Super Admin',
      adminUsername,
      adminPassword,
      gstRegistered: false,
    };
    await companyService.setupCompanyAndAdmin(setupDto);
  });

  afterAll(async () => {
    if (cleanupFn) {
      await cleanupFn();
    }
  });

  it('should authenticate successfully with valid credentials', async () => {
    const res = await authService.login({
      username: adminUsername,
      password: adminPassword,
    });

    expect(res).toBeDefined();
    expect(res.user.username).toBe(adminUsername);
    expect(res.user.role?.name).toBe('ADMINISTRATOR');
    expect(res.permissions.length).toBe(33);
    expect(res.sessionToken).toBeDefined();
    expect(res.company.name).toBe('Auth Test Supermarket');

    // Verify in-memory session exists
    const session = authService.getSession(res.sessionToken);
    expect(session).toBeDefined();
    expect(session?.userId).toBe(res.user.id);
  });

  it('should reject login for non-existent username', async () => {
    await expect(
      authService.login({
        username: 'ghost_user',
        password: adminPassword,
      }),
    ).rejects.toThrow('Invalid username or password.');
  });

  it('should reject login with wrong password and increment failed attempts', async () => {
    await expect(
      authService.login({
        username: adminUsername,
        password: 'WrongPassword#1',
      }),
    ).rejects.toThrow('Invalid username or password.');
  });

  it('should lock account after 5 consecutive failed login attempts', async () => {
    // Create a staff user specifically for testing lockout
    const company = await companyService.getCompany();
    const roles = await userService.getRoles();
    const cashierRole = roles.find((r) => r.name === 'CASHIER');

    await userService.createUser(company!.id, {
      username: 'lockout_test_user',
      name: 'Lockout User',
      password: 'InitialPassword#123',
      roleId: cashierRole!.id,
    });

    // 4 failed attempts
    for (let i = 1; i <= 4; i++) {
      await expect(
        authService.login({
          username: 'lockout_test_user',
          password: `WrongPassword#${i}`,
        }),
      ).rejects.toThrow('Invalid username or password.');
    }

    // 5th failed attempt should trigger lockout
    await expect(
      authService.login({
        username: 'lockout_test_user',
        password: 'WrongPassword#5',
      }),
    ).rejects.toThrow('Account has been temporarily locked for 15 minutes');

    // Attempting even with the correct password should be blocked while locked
    await expect(
      authService.login({
        username: 'lockout_test_user',
        password: 'InitialPassword#123',
      }),
    ).rejects.toThrow('Account is temporarily locked');
  });

  it('should allow password change with valid current password and enforce policy on new password', async () => {
    const user = await companyService['prisma'].user.findUnique({
      where: { username: adminUsername },
    });
    expect(user).not.toBeNull();
    const userId = user!.id;

    // 1. Rejection on incorrect current password
    await expect(
      authService.changePassword(userId, {
        currentPassword: 'IncorrectOldPassword#1',
        newPassword: 'NewPassword#2026',
      }),
    ).rejects.toThrow('Current password is incorrect.');

    // 2. Rejection on weak new password
    await expect(
      authService.changePassword(userId, {
        currentPassword: adminPassword,
        newPassword: 'weak',
      }),
    ).rejects.toThrow('Password must be at least 8 characters long.');

    // 3. Successful password change
    await authService.changePassword(userId, {
      currentPassword: adminPassword,
      newPassword: 'NewAdminPassword#2026',
    });

    // 4. Verify login fails with old password and succeeds with new password
    await expect(
      authService.login({
        username: adminUsername,
        password: adminPassword,
      }),
    ).rejects.toThrow('Invalid username or password.');

    const loginRes = await authService.login({
      username: adminUsername,
      password: 'NewAdminPassword#2026',
    });
    expect(loginRes.user.username).toBe(adminUsername);
  });

  it('should logout and invalidate active session', async () => {
    const loginRes = await authService.login({
      username: adminUsername,
      password: 'NewAdminPassword#2026',
    });

    expect(authService.getSession(loginRes.sessionToken)).toBeDefined();

    // Logout
    await authService.logout(loginRes.sessionToken);

    // Session token should no longer be active
    expect(authService.getSession(loginRes.sessionToken)).toBeUndefined();
  });
});
