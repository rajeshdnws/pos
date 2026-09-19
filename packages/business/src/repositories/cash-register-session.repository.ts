import { Prisma, PrismaClient } from '@prisma/client';
import { CashRegisterSession } from '@rs-inventory/types';

export class CashRegisterSessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findById(id: string, companyId?: string): Promise<CashRegisterSession | null> {
    const where: Prisma.CashRegisterSessionWhereInput = { id };
    if (companyId) where.companyId = companyId;

    const record = await this.prisma.cashRegisterSession.findFirst({
      where,
      include: {
        cashRegister: true,
      },
    });
    return record as unknown as CashRegisterSession | null;
  }

  public async findActiveSession(
    companyId: string,
    cashRegisterId?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<CashRegisterSession | null> {
    const client = tx || this.prisma;
    const where: Prisma.CashRegisterSessionWhereInput = {
      companyId,
      status: 'OPEN',
    };
    if (cashRegisterId) {
      where.cashRegisterId = cashRegisterId;
    }

    const record = await client.cashRegisterSession.findFirst({
      where,
      include: {
        cashRegister: true,
      },
      orderBy: { openedAt: 'desc' },
    });
    return record as unknown as CashRegisterSession | null;
  }

  public async create(
    data: Prisma.CashRegisterSessionUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<CashRegisterSession> {
    const client = tx || this.prisma;
    const record = await client.cashRegisterSession.create({
      data,
      include: {
        cashRegister: true,
      },
    });
    return record as unknown as CashRegisterSession;
  }

  public async update(
    id: string,
    data: Prisma.CashRegisterSessionUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ): Promise<CashRegisterSession> {
    const client = tx || this.prisma;
    const record = await client.cashRegisterSession.update({
      where: { id },
      data,
      include: {
        cashRegister: true,
      },
    });
    return record as unknown as CashRegisterSession;
  }

  public async findUnclosedCount(companyId: string): Promise<number> {
    return this.prisma.cashRegisterSession.count({
      where: { companyId, status: 'OPEN' },
    });
  }
}
