import {
  AuditService,
  AuthService,
  CompanyService,
  SettingsService,
  UserService,
} from '@rs-inventory/business';
import { DatabaseService } from '@rs-inventory/database';
import {
  ApiResponse,
  AppConfig,
  AuditLog,
  ChangePasswordDTO,
  Company,
  CompanySetupDTO,
  DatabaseHealth,
  IPC_CHANNELS,
  LogLevel,
  LoginRequestDTO,
  LoginResponseDTO,
  ResetPasswordDTO,
  Role,
  Setting,
  SystemInfo,
  User,
  UserCreateDTO,
  UserUpdateDTO,
  WindowAction,
} from '@rs-inventory/types';
import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { ConfigService } from '../services/config.service.js';
import { LoggerService } from '../services/logger.service.js';

let activeSessionUser: User | null = null;
let activeSessionToken: string | null = null;
let activeSessionPermissions: string[] = [];

export function registerIpcHandlers(): void {
  const configService = ConfigService.getInstance();
  const loggerService = LoggerService.getInstance();
  const dbService = DatabaseService.getInstance();
  const prisma = dbService.getClient();

  const authService = new AuthService(prisma);
  const companyService = new CompanyService(prisma);
  const userService = new UserService(prisma);
  const settingsService = new SettingsService(prisma);
  const auditService = new AuditService(prisma);

  // Helper for error formatting
  const handleSuccess = <T>(data: T): ApiResponse<T> => ({ success: true, data });
  const handleError = (error: unknown, defaultCode: string): ApiResponse<any> => {
    loggerService.error(`IPC Handler Error (${defaultCode})`, error);
    const errObj = error as { code?: string; message?: string; details?: unknown };
    return {
      success: false,
      error: {
        code: errObj.code || defaultCode,
        message: errObj.message || 'An unexpected error occurred.',
        details: errObj.details,
        timestamp: new Date().toISOString(),
      },
    };
  };

  // ---------------- Base Application & System ----------------

  ipcMain.handle(IPC_CHANNELS.APP_GET_CONFIG, async (): Promise<ApiResponse<AppConfig>> => {
    try {
      return handleSuccess(configService.getConfig());
    } catch (err) {
      return handleError(err, 'CONFIG_ERROR');
    }
  });

  ipcMain.handle(IPC_CHANNELS.SYSTEM_GET_INFO, async (): Promise<ApiResponse<SystemInfo>> => {
    try {
      const mem = process.memoryUsage();
      const systemInfo: SystemInfo = {
        platform: process.platform,
        arch: process.arch,
        osVersion: `${os.type()} ${os.release()}`,
        nodeVersion: process.versions.node,
        electronVersion: process.versions.electron || 'unknown',
        uptimeSeconds: Math.round(process.uptime()),
        memoryUsageMb: Math.round(mem.rss / 1024 / 1024),
      };
      return handleSuccess(systemInfo);
    } catch (err) {
      return handleError(err, 'SYSTEM_INFO_ERROR');
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.DATABASE_HEALTH_CHECK,
    async (): Promise<ApiResponse<DatabaseHealth>> => {
      try {
        const health = await dbService.healthCheck();
        return handleSuccess(health);
      } catch (err) {
        return handleError(err, 'DATABASE_HEALTH_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.LOGGER_LOG,
    async (
      _event,
      payload: { level: LogLevel; message: string; meta?: unknown },
    ): Promise<ApiResponse<void>> => {
      try {
        loggerService.log(payload.level, `[Renderer] ${payload.message}`, payload.meta);
        return handleSuccess(undefined);
      } catch {
        return { success: false };
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.WINDOW_CONTROL,
    async (_event, action: WindowAction): Promise<ApiResponse<void>> => {
      try {
        const win = BrowserWindow.getFocusedWindow();
        switch (action) {
          case 'minimize':
            win?.minimize();
            break;
          case 'maximize':
            if (win?.isMaximized()) win.unmaximize();
            else win?.maximize();
            break;
          case 'close':
            win?.close();
            break;
          case 'restart':
            app.relaunch();
            app.exit(0);
            break;
        }
        return handleSuccess(undefined);
      } catch (err) {
        return handleError(err, 'WINDOW_CONTROL_ERROR');
      }
    },
  );

  // ---------------- Authentication & Session ----------------

  ipcMain.handle(
    IPC_CHANNELS.AUTH_LOGIN,
    async (_event, credentials: LoginRequestDTO): Promise<ApiResponse<LoginResponseDTO>> => {
      try {
        const response = await authService.login(credentials);
        activeSessionUser = response.user;
        activeSessionToken = response.sessionToken;
        activeSessionPermissions = response.permissions;
        return handleSuccess(response);
      } catch (err) {
        return handleError(err, 'AUTH_ERROR');
      }
    },
  );

  ipcMain.handle(IPC_CHANNELS.AUTH_LOGOUT, async (): Promise<ApiResponse<void>> => {
    try {
      if (activeSessionToken) {
        await authService.logout(activeSessionToken);
      }
      activeSessionUser = null;
      activeSessionToken = null;
      activeSessionPermissions = [];
      return handleSuccess(undefined);
    } catch (err) {
      return handleError(err, 'LOGOUT_ERROR');
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.AUTH_GET_CURRENT_USER,
    async (): Promise<ApiResponse<LoginResponseDTO | null>> => {
      try {
        if (!activeSessionUser || !activeSessionToken) {
          return handleSuccess(null);
        }
        const company = await companyService.getCompany();
        return handleSuccess({
          user: activeSessionUser,
          sessionToken: activeSessionToken,
          permissions: activeSessionPermissions,
          company: company as Company,
        });
      } catch (err) {
        return handleError(err, 'SESSION_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.AUTH_CHANGE_PASSWORD,
    async (_event, dto: ChangePasswordDTO): Promise<ApiResponse<void>> => {
      try {
        if (!activeSessionUser) {
          return handleError(new Error('Unauthorized session.'), 'AUTH_UNAUTHORIZED');
        }
        await authService.changePassword(activeSessionUser.id, dto);
        return handleSuccess(undefined);
      } catch (err) {
        return handleError(err, 'CHANGE_PASSWORD_ERROR');
      }
    },
  );

  // ---------------- Company Setup & Profile ----------------

  ipcMain.handle(
    IPC_CHANNELS.COMPANY_CHECK_SETUP,
    async (): Promise<ApiResponse<{ isSetup: boolean; company?: Company | null }>> => {
      try {
        const isSetup = await companyService.hasCompany();
        const company = isSetup ? await companyService.getCompany() : null;
        return handleSuccess({ isSetup, company });
      } catch (err) {
        return handleError(err, 'COMPANY_CHECK_ERROR');
      }
    },
  );

  ipcMain.handle(IPC_CHANNELS.COMPANY_GET, async (): Promise<ApiResponse<Company | null>> => {
    try {
      const company = await companyService.getCompany();
      return handleSuccess(company);
    } catch (err) {
      return handleError(err, 'COMPANY_GET_ERROR');
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.COMPANY_SETUP,
    async (_event, dto: CompanySetupDTO): Promise<ApiResponse<LoginResponseDTO>> => {
      try {
        const response = await companyService.setupCompanyAndAdmin(dto);
        activeSessionUser = response.user;
        activeSessionToken = response.sessionToken;
        activeSessionPermissions = response.permissions;
        return handleSuccess(response);
      } catch (err) {
        return handleError(err, 'COMPANY_SETUP_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.COMPANY_UPDATE,
    async (_event, dto: Partial<Company>): Promise<ApiResponse<Company>> => {
      try {
        const company = await companyService.getCompany();
        if (!company) {
          return handleError(new Error('No active company found.'), 'NOT_FOUND');
        }
        const updated = await companyService.updateCompany(company.id, dto);
        return handleSuccess(updated);
      } catch (err) {
        return handleError(err, 'COMPANY_UPDATE_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.COMPANY_SELECT_LOGO,
    async (): Promise<ApiResponse<string | null>> => {
      try {
        const focusedWindow = BrowserWindow.getFocusedWindow();
        const options = {
          title: 'Select Company Logo',
          filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
          properties: ['openFile' as const],
        };
        const result = focusedWindow
          ? await dialog.showOpenDialog(focusedWindow, options)
          : await dialog.showOpenDialog(options);

        if (result.canceled || result.filePaths.length === 0) {
          return handleSuccess(null);
        }

        const sourceFilePath = result.filePaths[0];
        if (!sourceFilePath) {
          return handleSuccess(null);
        }
        const stat = fs.statSync(sourceFilePath);

        // 2MB max check
        if (stat.size > 2 * 1024 * 1024) {
          return handleError(
            new Error('Logo image must be smaller than 2 MB.'),
            'VALIDATION_ERROR',
          );
        }

        const targetDir = path.join(configService.getAppDataRoot(), 'company');
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        const ext = path.extname(sourceFilePath);
        const targetFilePath = path.join(targetDir, `logo${ext}`);
        fs.copyFileSync(sourceFilePath, targetFilePath);

        return handleSuccess(targetFilePath);
      } catch (err) {
        return handleError(err, 'LOGO_UPLOAD_ERROR');
      }
    },
  );

  // ---------------- Users & Roles ----------------

  ipcMain.handle(IPC_CHANNELS.USERS_LIST, async (): Promise<ApiResponse<User[]>> => {
    try {
      const company = await companyService.getCompany();
      if (!company) return handleSuccess([]);
      const users = await userService.listUsers(company.id);
      return handleSuccess(users);
    } catch (err) {
      return handleError(err, 'USERS_LIST_ERROR');
    }
  });

  ipcMain.handle(IPC_CHANNELS.ROLES_GET_ALL, async (): Promise<ApiResponse<Role[]>> => {
    try {
      const roles = await userService.getRoles();
      return handleSuccess(roles);
    } catch (err) {
      return handleError(err, 'ROLES_ERROR');
    }
  });

  ipcMain.handle(
    IPC_CHANNELS.USERS_CREATE,
    async (_event, dto: UserCreateDTO): Promise<ApiResponse<User>> => {
      try {
        const company = await companyService.getCompany();
        if (!company) return handleError(new Error('Company not configured.'), 'BUSINESS_ERROR');
        const user = await userService.createUser(company.id, dto, activeSessionUser?.id);
        return handleSuccess(user);
      } catch (err) {
        return handleError(err, 'USER_CREATE_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.USERS_UPDATE,
    async (_event, payload: { id: string; dto: UserUpdateDTO }): Promise<ApiResponse<User>> => {
      try {
        const user = await userService.updateUser(payload.id, payload.dto, activeSessionUser?.id);
        return handleSuccess(user);
      } catch (err) {
        return handleError(err, 'USER_UPDATE_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.USERS_TOGGLE_ACTIVE,
    async (_event, id: string): Promise<ApiResponse<User>> => {
      try {
        const user = await userService.toggleUserActive(id, activeSessionUser?.id);
        return handleSuccess(user);
      } catch (err) {
        return handleError(err, 'USER_TOGGLE_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.USERS_RESET_PASSWORD,
    async (_event, dto: ResetPasswordDTO): Promise<ApiResponse<void>> => {
      try {
        await userService.resetPassword(dto.userId, dto.newPassword, activeSessionUser?.id);
        return handleSuccess(undefined);
      } catch (err) {
        return handleError(err, 'RESET_PASSWORD_ERROR');
      }
    },
  );

  // ---------------- Settings & Audits ----------------

  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_GET_ALL,
    async (): Promise<ApiResponse<Record<string, string>>> => {
      try {
        const company = await companyService.getCompany();
        if (!company) return handleSuccess({});
        const settings = await settingsService.getSettings(company.id);
        return handleSuccess(settings);
      } catch (err) {
        return handleError(err, 'SETTINGS_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.SETTINGS_UPDATE,
    async (_event, settingsMap: Record<string, string>): Promise<ApiResponse<Setting[]>> => {
      try {
        const company = await companyService.getCompany();
        if (!company) return handleError(new Error('Company not configured.'), 'BUSINESS_ERROR');
        const updated = await settingsService.updateSettings(company.id, settingsMap);
        return handleSuccess(updated);
      } catch (err) {
        return handleError(err, 'SETTINGS_UPDATE_ERROR');
      }
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.AUDIT_GET_LOGS,
    async (_event, limit?: number): Promise<ApiResponse<AuditLog[]>> => {
      try {
        const company = await companyService.getCompany();
        if (!company) return handleSuccess([]);
        const logs = await auditService.getLogs(company.id, limit || 100);
        return handleSuccess(logs);
      } catch (err) {
        return handleError(err, 'AUDIT_LOGS_ERROR');
      }
    },
  );
}
