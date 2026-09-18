import { PrismaClient } from '@prisma/client';
import { AuditLog } from '@rs-inventory/types';

export interface RecordAuditParams {
  companyId: string;
  userId?: string | null;
  action: string;
  module: string;
  referenceId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string | null;
}

export class AuditService {
  constructor(private readonly prisma: PrismaClient) {}

  public async recordLog(params: RecordAuditParams, tx?: PrismaClient): Promise<AuditLog> {
    const client = tx || this.prisma;

    const safeOldValue = params.oldValue ? JSON.stringify(this.sanitize(params.oldValue)) : null;
    const safeNewValue = params.newValue ? JSON.stringify(this.sanitize(params.newValue)) : null;

    const log = await client.auditLog.create({
      data: {
        companyId: params.companyId,
        userId: params.userId || null,
        action: params.action,
        module: params.module,
        referenceId: params.referenceId || null,
        oldValue: safeOldValue,
        newValue: safeNewValue,
        ipAddress: params.ipAddress || '127.0.0.1',
      },
      include: {
        user: {
          select: {
            name: true,
            username: true,
          },
        },
      },
    });

    return log as unknown as AuditLog;
  }

  public async getLogs(companyId: string, limit: number = 100): Promise<AuditLog[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            name: true,
            username: true,
          },
        },
      },
    });

    return logs as unknown as AuditLog[];
  }

  private sanitize(data: unknown): unknown {
    if (!data || typeof data !== 'object') return data;
    const sensitive = ['password', 'passwordhash', 'token', 'secret'];
    const copy: Record<string, unknown> = { ...(data as Record<string, unknown>) };

    for (const key of Object.keys(copy)) {
      if (sensitive.some((s) => key.toLowerCase().includes(s))) {
        copy[key] = '***REDACTED***';
      }
    }
    return copy;
  }
}
