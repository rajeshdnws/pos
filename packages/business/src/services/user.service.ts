import { PrismaClient } from '@prisma/client';
import {
  Role,
  User,
  UserCreateDTO,
  UserUpdateDTO,
  RoleCreateDTO,
  RoleUpdateDTO,
  RoleWithPermissionsDTO,
  PermissionDefinition,
} from '@rs-inventory/types';
import { BusinessRuleError, NotFoundError, ValidationError } from '../errors/app.error.js';
import { PasswordService } from '../utils/password.js';
import { ValidationUtils } from '../utils/validation.js';

export class UserService {
  constructor(private readonly prisma: PrismaClient) {}

  public async listUsers(companyId: string): Promise<User[]> {
    const users = await this.prisma.user.findMany({
      where: { companyId },
      include: {
        role: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return users as unknown as User[];
  }

  public async getRoles(): Promise<Role[]> {
    const roles = await this.prisma.role.findMany({
      include: {
        permissions: {
          include: { permission: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return roles as unknown as Role[];
  }

  public async createUser(
    companyId: string,
    dto: UserCreateDTO,
    actorUserId?: string,
  ): Promise<User> {
    const cleanUsername = dto.username?.trim().toLowerCase();
    if (!cleanUsername || cleanUsername.length < 3) {
      throw new ValidationError('Username must be at least 3 characters long.');
    }
    if (!dto.name || dto.name.trim().length === 0) {
      throw new ValidationError('Full Name is required.');
    }
    if (!dto.roleId) {
      throw new ValidationError('Role selection is required.');
    }

    const policyCheck = PasswordService.validatePasswordPolicy(dto.password);
    if (!policyCheck.valid) {
      throw new ValidationError(
        policyCheck.message || 'Password does not meet security requirements.',
      );
    }

    if (dto.email && !ValidationUtils.isValidEmail(dto.email)) {
      throw new ValidationError('Invalid email format.');
    }
    if (dto.mobile && !ValidationUtils.isValidMobile(dto.mobile)) {
      throw new ValidationError('Invalid 10-digit mobile number.');
    }

    // Ensure username is unique
    const existing = await this.prisma.user.findUnique({
      where: { username: cleanUsername },
    });
    if (existing) {
      throw new ValidationError(`Username '${cleanUsername}' is already taken.`);
    }

    // Ensure role exists
    const role = await this.prisma.role.findUnique({
      where: { id: dto.roleId },
    });
    if (!role) {
      throw new ValidationError('Specified role does not exist.');
    }

    const passwordHash = await PasswordService.hashPassword(dto.password);

    const newUser = await this.prisma.user.create({
      data: {
        companyId,
        username: cleanUsername,
        name: dto.name.trim(),
        email: dto.email?.trim() || null,
        mobile: dto.mobile?.trim() || null,
        roleId: dto.roleId,
        passwordHash,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
      include: {
        role: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        companyId,
        userId: actorUserId || null,
        action: 'USER_CREATED',
        module: 'USERS',
        referenceId: newUser.id,
        newValue: JSON.stringify({
          username: newUser.username,
          name: newUser.name,
          role: role.name,
        }),
        ipAddress: '127.0.0.1',
      },
    });

    return newUser as unknown as User;
  }

  public async updateUser(userId: string, dto: UserUpdateDTO, actorUserId?: string): Promise<User> {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!existing) {
      throw new NotFoundError('User', userId);
    }

    if (dto.email && !ValidationUtils.isValidEmail(dto.email)) {
      throw new ValidationError('Invalid email format.');
    }
    if (dto.mobile && !ValidationUtils.isValidMobile(dto.mobile)) {
      throw new ValidationError('Invalid 10-digit mobile number.');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : existing.name,
        email: dto.email !== undefined ? (dto.email ? dto.email.trim() : null) : existing.email,
        mobile:
          dto.mobile !== undefined ? (dto.mobile ? dto.mobile.trim() : null) : existing.mobile,
        roleId: dto.roleId !== undefined ? dto.roleId : existing.roleId,
      },
      include: {
        role: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        companyId: existing.companyId,
        userId: actorUserId || null,
        action: 'USER_UPDATED',
        module: 'USERS',
        referenceId: userId,
        oldValue: JSON.stringify({
          name: existing.name,
          email: existing.email,
          roleId: existing.roleId,
        }),
        newValue: JSON.stringify({
          name: updated.name,
          email: updated.email,
          roleId: updated.roleId,
        }),
        ipAddress: '127.0.0.1',
      },
    });

    return updated as unknown as User;
  }

  /**
   * Toggles active state.
   * STRICT ENFORCEMENT: Never deactivates the last active Administrator.
   */
  public async toggleUserActive(userId: string, actorUserId?: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      throw new NotFoundError('User', userId);
    }

    // If currently active and is Administrator, ensure at least one other active Administrator exists
    if (user.isActive && user.role?.name === 'ADMINISTRATOR') {
      const activeAdminCount = await this.prisma.user.count({
        where: {
          companyId: user.companyId,
          isActive: true,
          role: {
            name: 'ADMINISTRATOR',
          },
        },
      });

      if (activeAdminCount <= 1) {
        throw new BusinessRuleError('Cannot deactivate the last active Administrator account.');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        isActive: !user.isActive,
      },
      include: { role: true },
    });

    await this.prisma.auditLog.create({
      data: {
        companyId: user.companyId,
        userId: actorUserId || null,
        action: updated.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
        module: 'USERS',
        referenceId: user.id,
        newValue: JSON.stringify({ username: user.username, isActive: updated.isActive }),
        ipAddress: '127.0.0.1',
      },
    });

    return updated as unknown as User;
  }

  public async resetPassword(
    userId: string,
    newPassword: string,
    actorUserId?: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User', userId);
    }

    const policyCheck = PasswordService.validatePasswordPolicy(newPassword);
    if (!policyCheck.valid) {
      throw new ValidationError(policyCheck.message || 'Password does not meet requirements.');
    }

    const newHash = await PasswordService.hashPassword(newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        companyId: user.companyId,
        userId: actorUserId || null,
        action: 'USER_PASSWORD_RESET',
        module: 'USERS',
        referenceId: user.id,
        ipAddress: '127.0.0.1',
      },
    });
  }

  // ── Role & Permission Management ─────────────────────────────────────────────

  public async listAllPermissions(): Promise<PermissionDefinition[]> {
    const perms = await this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { name: 'asc' }],
    });
    return perms as unknown as PermissionDefinition[];
  }

  public async getRolesMatrix(): Promise<RoleWithPermissionsDTO[]> {
    const roles = await this.prisma.role.findMany({
      include: {
        permissions: {
          include: { permission: true },
        },
        _count: {
          select: { users: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return roles.map((r) => ({
      ...r,
      userCount: r._count.users,
    })) as unknown as RoleWithPermissionsDTO[];
  }

  public async createRole(
    companyId: string,
    dto: RoleCreateDTO,
    actorUserId?: string,
  ): Promise<Role> {
    const cleanName = dto.name?.trim().toUpperCase();
    if (!cleanName || cleanName.length < 2) {
      throw new ValidationError('Role name must be at least 2 characters long.');
    }

    const existing = await this.prisma.role.findUnique({
      where: { name: cleanName },
    });
    if (existing) {
      throw new ValidationError(`Role '${cleanName}' already exists.`);
    }

    const permissions = await this.prisma.permission.findMany({
      where: { code: { in: dto.permissionCodes || [] } },
      select: { id: true, code: true },
    });

    const newRole = await this.prisma.role.create({
      data: {
        name: cleanName,
        description: dto.description?.trim() || null,
        isSystemRole: false,
        permissions: {
          create: permissions.map((p) => ({
            permissionId: p.id,
          })),
        },
      },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        companyId,
        userId: actorUserId || null,
        action: 'ROLE_CREATED',
        module: 'USERS',
        referenceId: newRole.id,
        newValue: JSON.stringify({ name: newRole.name, permissionsCount: permissions.length }),
        ipAddress: '127.0.0.1',
      },
    });

    return newRole as unknown as Role;
  }

  public async updateRole(
    roleId: string,
    dto: RoleUpdateDTO,
    actorUserId?: string,
  ): Promise<Role> {
    const existing = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: { permissions: { include: { permission: true } } },
    });

    if (!existing) {
      throw new NotFoundError('Role', roleId);
    }

    let updatedName = existing.name;
    if (dto.name && dto.name.trim().toUpperCase() !== existing.name) {
      if (existing.isSystemRole) {
        throw new BusinessRuleError('Cannot rename a built-in system role.');
      }
      updatedName = dto.name.trim().toUpperCase();
      const duplicate = await this.prisma.role.findUnique({ where: { name: updatedName } });
      if (duplicate && duplicate.id !== roleId) {
        throw new ValidationError(`Role name '${updatedName}' is already taken.`);
      }
    }

    const updatedRole = await this.prisma.$transaction(async (tx) => {
      if (dto.permissionCodes !== undefined) {
        const perms = await tx.permission.findMany({
          where: { code: { in: dto.permissionCodes } },
          select: { id: true },
        });

        await tx.rolePermission.deleteMany({
          where: { roleId },
        });

        if (perms.length > 0) {
          for (const p of perms) {
            await tx.rolePermission.create({
              data: {
                roleId,
                permissionId: p.id,
              },
            });
          }
        }
      }

      return tx.role.update({
        where: { id: roleId },
        data: {
          name: updatedName,
          description: dto.description !== undefined ? dto.description?.trim() || null : existing.description,
        },
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      });
    });

    const userInCompany = await this.prisma.user.findFirst({
      where: { roleId },
      select: { companyId: true },
    });
    const companyId = userInCompany?.companyId || (await this.prisma.company.findFirst({ select: { id: true } }))?.id || '';

    if (companyId) {
      await this.prisma.auditLog.create({
        data: {
          companyId,
          userId: actorUserId || null,
          action: 'ROLE_UPDATED',
          module: 'USERS',
          referenceId: roleId,
          oldValue: JSON.stringify({ name: existing.name }),
          newValue: JSON.stringify({ name: updatedRole.name, permissionsCount: dto.permissionCodes?.length }),
          ipAddress: '127.0.0.1',
        },
      });
    }

    return updatedRole as unknown as Role;
  }

  public async deleteRole(roleId: string, actorUserId?: string): Promise<{ message: string }> {
    const existing = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        _count: { select: { users: true } },
      },
    });

    if (!existing) {
      throw new NotFoundError('Role', roleId);
    }
    if (existing.isSystemRole) {
      throw new BusinessRuleError('Built-in system roles cannot be deleted.');
    }
    if (existing._count.users > 0) {
      throw new BusinessRuleError(
        `Cannot delete role '${existing.name}' because ${existing._count.users} user(s) are currently assigned to it. Reassign those users first.`,
      );
    }

    const userInCompany = await this.prisma.user.findFirst({ select: { companyId: true } });
    const companyId = userInCompany?.companyId || '';

    await this.prisma.role.delete({
      where: { id: roleId },
    });

    if (companyId) {
      await this.prisma.auditLog.create({
        data: {
          companyId,
          userId: actorUserId || null,
          action: 'ROLE_DELETED',
          module: 'USERS',
          referenceId: roleId,
          oldValue: JSON.stringify({ name: existing.name }),
          ipAddress: '127.0.0.1',
        },
      });
    }

    return { message: `Role '${existing.name}' deleted successfully.` };
  }

  public async updateRolePermissions(
    roleId: string,
    permissionCodes: string[],
    actorUserId?: string,
  ): Promise<{ message: string }> {
    await this.updateRole(roleId, { permissionCodes }, actorUserId);
    return { message: 'Role permissions updated successfully.' };
  }
}
