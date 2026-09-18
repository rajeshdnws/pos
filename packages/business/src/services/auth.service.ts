import { PrismaClient } from '@prisma/client';
import {
  ChangePasswordDTO,
  Company,
  LoginRequestDTO,
  LoginResponseDTO,
  User,
} from '@rs-inventory/types';
import { AppError, ValidationError } from '../errors/app.error.js';
import { PasswordService } from '../utils/password.js';

export interface ActiveSession {
  sessionToken: string;
  userId: string;
  companyId: string;
  roleId?: string | null;
  loginTime: string;
}

export class AuthService {
  private static readonly MAX_FAILED_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

  // In-memory active session registry for Solo offline mode
  private activeSessions = new Map<string, ActiveSession>();

  constructor(private readonly prisma: PrismaClient) {}

  public async login(credentials: LoginRequestDTO): Promise<LoginResponseDTO> {
    const cleanUsername = credentials.username?.trim().toLowerCase();
    if (!cleanUsername || !credentials.password) {
      throw new AppError('AUTH_INVALID_CREDENTIALS', 'Invalid username or password.');
    }

    const userRecord = await this.prisma.user.findUnique({
      where: { username: cleanUsername },
      include: {
        company: true,
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    if (!userRecord) {
      throw new AppError('AUTH_INVALID_CREDENTIALS', 'Invalid username or password.');
    }

    if (!userRecord.isActive) {
      throw new AppError(
        'AUTH_INACTIVE',
        'This account has been deactivated. Please contact an administrator.',
      );
    }

    // Check Account Lockout
    const now = new Date();
    if (userRecord.lockedUntil && userRecord.lockedUntil > now) {
      const remainingMinutes = Math.ceil(
        (userRecord.lockedUntil.getTime() - now.getTime()) / (60 * 1000),
      );
      throw new AppError(
        'AUTH_ACCOUNT_LOCKED',
        `Account is temporarily locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minute(s).`,
      );
    }

    // Verify Password
    const isPasswordValid = await PasswordService.verifyPassword(
      credentials.password,
      userRecord.passwordHash,
    );

    if (!isPasswordValid) {
      const attempts = (userRecord.failedLoginAttempts || 0) + 1;
      let lockUntil: Date | null = null;

      if (attempts >= AuthService.MAX_FAILED_ATTEMPTS) {
        lockUntil = new Date(now.getTime() + AuthService.LOCKOUT_DURATION_MS);
      }

      await this.prisma.user.update({
        where: { id: userRecord.id },
        data: {
          failedLoginAttempts: attempts,
          lockedUntil: lockUntil,
        },
      });

      await this.prisma.auditLog.create({
        data: {
          companyId: userRecord.companyId,
          userId: userRecord.id,
          action: 'LOGIN_FAILED',
          module: 'AUTH',
          referenceId: userRecord.id,
          newValue: JSON.stringify({ attempts, locked: Boolean(lockUntil) }),
          ipAddress: '127.0.0.1',
        },
      });

      if (lockUntil) {
        throw new AppError(
          'AUTH_ACCOUNT_LOCKED',
          'Account has been temporarily locked for 15 minutes due to 5 failed login attempts.',
        );
      }

      throw new AppError('AUTH_INVALID_CREDENTIALS', 'Invalid username or password.');
    }

    // Successful Login: reset failed attempts & lockout
    await this.prisma.user.update({
      where: { id: userRecord.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: now,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        companyId: userRecord.companyId,
        userId: userRecord.id,
        action: 'LOGIN_SUCCESS',
        module: 'AUTH',
        referenceId: userRecord.id,
        ipAddress: '127.0.0.1',
      },
    });

    const sessionToken = `solo-sess-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const permissions = userRecord.role?.permissions.map((p) => p.permission.code) || [];

    this.activeSessions.set(sessionToken, {
      sessionToken,
      userId: userRecord.id,
      companyId: userRecord.companyId,
      roleId: userRecord.roleId,
      loginTime: now.toISOString(),
    });

    return {
      user: {
        id: userRecord.id,
        companyId: userRecord.companyId,
        username: userRecord.username,
        name: userRecord.name,
        email: userRecord.email,
        mobile: userRecord.mobile,
        roleId: userRecord.roleId,
        role: userRecord.role
          ? {
              id: userRecord.role.id,
              name: userRecord.role.name,
              isSystemRole: userRecord.role.isSystemRole,
            }
          : null,
        isActive: userRecord.isActive,
        lastLoginAt: userRecord.lastLoginAt,
        createdAt: userRecord.createdAt,
        updatedAt: userRecord.updatedAt,
      } as unknown as User,
      sessionToken,
      permissions,
      company: userRecord.company as unknown as Company,
    };
  }

  public async logout(sessionToken?: string): Promise<void> {
    if (sessionToken && this.activeSessions.has(sessionToken)) {
      const session = this.activeSessions.get(sessionToken);
      this.activeSessions.delete(sessionToken);

      if (session) {
        await this.prisma.auditLog.create({
          data: {
            companyId: session.companyId,
            userId: session.userId,
            action: 'LOGOUT',
            module: 'AUTH',
            referenceId: session.userId,
            ipAddress: '127.0.0.1',
          },
        });
      }
    }
  }

  public getSession(sessionToken: string): ActiveSession | undefined {
    return this.activeSessions.get(sessionToken);
  }

  public async changePassword(userId: string, dto: ChangePasswordDTO): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('NOT_FOUND', 'User account not found.');
    }

    const isValidCurrent = await PasswordService.verifyPassword(
      dto.currentPassword,
      user.passwordHash,
    );
    if (!isValidCurrent) {
      throw new ValidationError('Current password is incorrect.');
    }

    const policyCheck = PasswordService.validatePasswordPolicy(dto.newPassword);
    if (!policyCheck.valid) {
      throw new ValidationError(
        policyCheck.message || 'New password does not satisfy security policy.',
      );
    }

    const newHash = await PasswordService.hashPassword(dto.newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        companyId: user.companyId,
        userId: user.id,
        action: 'PASSWORD_CHANGED',
        module: 'USERS',
        referenceId: user.id,
        ipAddress: '127.0.0.1',
      },
    });
  }
}
