import { PrismaClient } from '@prisma/client';
import {
  CashInOutDTO,
  CashMovement,
  CashRegister,
  CashRegisterCreateDTO,
  CashRegisterOpenSessionDTO,
  CashRegisterSession,
  CashRegisterUpdateDTO,
  DayEndClosingPreview,
} from '@rs-inventory/types';
import { BusinessRuleError, NotFoundError, ValidationError } from '../errors/app.error.js';
import { CashMovementRepository } from '../repositories/cash-movement.repository.js';
import { CashRegisterSessionRepository } from '../repositories/cash-register-session.repository.js';
import { CashRegisterRepository } from '../repositories/cash-register.repository.js';
import { AuditService } from './audit.service.js';
import { SequenceService } from './sequence.service.js';

export class CashRegisterService {
  private registerRepo: CashRegisterRepository;
  private sessionRepo: CashRegisterSessionRepository;
  private movementRepo: CashMovementRepository;
  private sequenceService: SequenceService;
  private auditService: AuditService;

  constructor(private readonly prisma: PrismaClient) {
    this.registerRepo = new CashRegisterRepository(prisma);
    this.sessionRepo = new CashRegisterSessionRepository(prisma);
    this.movementRepo = new CashMovementRepository(prisma);
    this.sequenceService = new SequenceService(prisma);
    this.auditService = new AuditService(prisma);
  }

  // ─── Registers ────────────────────────────────────────────────────────────

  public async listRegisters(companyId: string, includeInactive: boolean = false): Promise<CashRegister[]> {
    return this.registerRepo.findAll(companyId, includeInactive);
  }

  public async getDefaultRegister(companyId: string): Promise<CashRegister> {
    return this.registerRepo.getDefault(companyId);
  }

  public async createRegister(
    companyId: string,
    dto: CashRegisterCreateDTO,
    userId?: string,
  ): Promise<CashRegister> {
    const name = dto.name?.trim();
    if (!name) throw new ValidationError('Register name is required.');

    let registerCode = dto.registerCode?.trim();
    if (!registerCode) {
      registerCode = await this.sequenceService.getNextNumber(companyId, 'REG', 4);
    }

    const created = await this.registerRepo.create(companyId, {
      ...dto,
      registerCode,
    });

    await this.auditService.log({
      companyId,
      userId: userId || null,
      action: 'CASH_REGISTER_CREATED',
      module: 'CASH_REGISTER',
      referenceId: created.id,
      newValue: JSON.stringify({ name: created.name, code: created.registerCode }),
    });

    return created;
  }

  public async updateRegister(
    companyId: string,
    id: string,
    dto: CashRegisterUpdateDTO,
    userId?: string,
  ): Promise<CashRegister> {
    const existing = await this.registerRepo.findById(id);
    if (!existing || existing.companyId !== companyId) {
      throw new NotFoundError('Cash register not found.');
    }

    const updated = await this.registerRepo.update(id, dto);

    await this.auditService.log({
      companyId,
      userId: userId || null,
      action: 'CASH_REGISTER_UPDATED',
      module: 'CASH_REGISTER',
      referenceId: id,
      newValue: JSON.stringify(dto),
    });

    return updated;
  }

  // ─── Sessions ─────────────────────────────────────────────────────────────

  public async getActiveSession(
    companyId: string,
    cashRegisterId?: string,
  ): Promise<CashRegisterSession | null> {
    // If no cashRegisterId specified, find default register
    let regId = cashRegisterId;
    if (!regId) {
      const def = await this.registerRepo.getDefault(companyId);
      regId = def.id;
    }
    return this.sessionRepo.findActiveSession(companyId, regId);
  }

  public async openSession(
    companyId: string,
    dto: CashRegisterOpenSessionDTO,
    userId?: string,
  ): Promise<CashRegisterSession> {
    const openingCash = Math.round((Number(dto.openingCash) || 0) * 100) / 100;
    if (openingCash < 0) {
      throw new ValidationError('Opening cash amount cannot be negative.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Resolve register
      let registerId = dto.cashRegisterId;
      if (!registerId) {
        let defReg = await tx.cashRegister.findFirst({
          where: { companyId, isActive: true },
          orderBy: { createdAt: 'asc' },
        });
        if (!defReg) {
          defReg = await tx.cashRegister.create({
            data: {
              companyId,
              registerCode: 'REG-MAIN',
              name: 'Main Counter',
              isActive: true,
            },
          });
        }
        registerId = defReg.id;
      }

      // Check register is active
      const register = await tx.cashRegister.findUnique({
        where: { id: registerId },
      });
      if (!register || register.companyId !== companyId || !register.isActive) {
        throw new BusinessRuleError('Selected cash register is invalid or inactive.');
      }

      // Ensure no other session is open for this register
      const existingOpen = await tx.cashRegisterSession.findFirst({
        where: { companyId, cashRegisterId: registerId, status: 'OPEN' },
      });
      if (existingOpen) {
        throw new BusinessRuleError(
          `Cash register "${register.name}" already has an active session (${existingOpen.sessionNumber}). Please close it first.`,
        );
      }

      // Generate session number
      const sessionNumber = await this.sequenceService.getNextNumber(companyId, 'SES', 6, tx);

      // Create session record
      const session = await tx.cashRegisterSession.create({
        data: {
          companyId,
          cashRegisterId: registerId,
          sessionNumber,
          openedBy: userId || null,
          openedAt: new Date(),
          openingCash,
          expectedCash: openingCash,
          status: 'OPEN',
          closingNotes: dto.openingNotes?.trim() || null,
        },
        include: {
          cashRegister: true,
        },
      });

      // Record OPENING_CASH movement
      const movNumber = await this.sequenceService.getNextNumber(companyId, 'MOV', 6, tx);
      await tx.cashMovement.create({
        data: {
          companyId,
          cashRegisterId: registerId,
          cashRegisterSessionId: session.id,
          movementNumber: movNumber,
          movementType: 'OPENING_CASH',
          amount: openingCash,
          movementDate: new Date(),
          referenceType: 'OPENING',
          referenceId: session.id,
          referenceNumber: sessionNumber,
          description: dto.openingNotes?.trim() || 'Session Opening Cash',
          createdBy: userId || null,
        },
      });

      await this.auditService.log(
        {
          companyId,
          userId: userId || null,
          action: 'REGISTER_SESSION_OPENED',
          module: 'CASH_REGISTER',
          referenceId: session.id,
          newValue: JSON.stringify({
            sessionNumber,
            registerName: register.name,
            openingCash,
          }),
        },
        tx,
      );

      return session as unknown as CashRegisterSession;
    });
  }

  // ─── Cash In & Cash Out ───────────────────────────────────────────────────

  public async recordCashIn(
    companyId: string,
    dto: CashInOutDTO,
    userId?: string,
  ): Promise<CashMovement> {
    const amount = Math.round((Number(dto.amount) || 0) * 100) / 100;
    if (amount <= 0) {
      throw new ValidationError('Cash In amount must be greater than zero.');
    }
    if (!dto.reason?.trim()) {
      throw new ValidationError('Reason is required for Cash In.');
    }

    return this.prisma.$transaction(async (tx) => {
      const session = await tx.cashRegisterSession.findFirst({
        where: { companyId, status: 'OPEN' },
        orderBy: { openedAt: 'desc' },
      });
      if (!session) {
        throw new BusinessRuleError('No active cash register session found. Please open a session first.');
      }

      const movementNumber = await this.sequenceService.getNextNumber(companyId, 'MOV', 6, tx);

      const movement = await tx.cashMovement.create({
        data: {
          companyId,
          cashRegisterId: session.cashRegisterId,
          cashRegisterSessionId: session.id,
          movementNumber,
          movementType: 'CASH_IN',
          amount,
          movementDate: new Date(),
          referenceType: 'MANUAL',
          referenceId: null,
          referenceNumber: null,
          description: `${dto.reason.trim()}${dto.notes?.trim() ? ` — ${dto.notes.trim()}` : ''}`,
          createdBy: userId || null,
        },
      });

      await this.auditService.log(
        {
          companyId,
          userId: userId || null,
          action: 'CASH_IN_RECORDED',
          module: 'CASH_REGISTER',
          referenceId: movement.id,
          newValue: JSON.stringify({ amount, reason: dto.reason }),
        },
        tx,
      );

      return movement as unknown as CashMovement;
    });
  }

  public async recordCashOut(
    companyId: string,
    dto: CashInOutDTO,
    userId?: string,
  ): Promise<CashMovement> {
    const amount = Math.round((Number(dto.amount) || 0) * 100) / 100;
    if (amount <= 0) {
      throw new ValidationError('Cash Out amount must be greater than zero.');
    }
    if (!dto.reason?.trim()) {
      throw new ValidationError('Reason is required for Cash Out.');
    }

    return this.prisma.$transaction(async (tx) => {
      const session = await tx.cashRegisterSession.findFirst({
        where: { companyId, status: 'OPEN' },
        orderBy: { openedAt: 'desc' },
      });
      if (!session) {
        throw new BusinessRuleError('No active cash register session found. Please open a session first.');
      }

      const movementNumber = await this.sequenceService.getNextNumber(companyId, 'MOV', 6, tx);

      const movement = await tx.cashMovement.create({
        data: {
          companyId,
          cashRegisterId: session.cashRegisterId,
          cashRegisterSessionId: session.id,
          movementNumber,
          movementType: 'CASH_OUT',
          amount,
          movementDate: new Date(),
          referenceType: 'MANUAL',
          referenceId: null,
          referenceNumber: null,
          description: `${dto.reason.trim()}${dto.notes?.trim() ? ` — ${dto.notes.trim()}` : ''}`,
          createdBy: userId || null,
        },
      });

      await this.auditService.log(
        {
          companyId,
          userId: userId || null,
          action: 'CASH_OUT_RECORDED',
          module: 'CASH_REGISTER',
          referenceId: movement.id,
          newValue: JSON.stringify({ amount, reason: dto.reason }),
        },
        tx,
      );

      return movement as unknown as CashMovement;
    });
  }

  // ─── Session Summary / Calculations ────────────────────────────────────────

  public async getSessionSummary(
    companyId: string,
    sessionId?: string,
  ): Promise<DayEndClosingPreview> {
    let session: CashRegisterSession | null = null;

    if (sessionId) {
      session = await this.sessionRepo.findById(sessionId, companyId);
    } else {
      session = await this.getActiveSession(companyId);
    }

    if (!session) {
      throw new NotFoundError('No cash register session found.');
    }

    const register = await this.registerRepo.findById(session.cashRegisterId);
    if (!register) {
      throw new NotFoundError('Cash register not found.');
    }

    const movements = await this.movementRepo.findBySessionId(session.id);

    let openingCash = session.openingCash;
    let cashSales = 0;
    let customerCashReceipts = 0;
    let supplierCashPayments = 0;
    let cashExpenses = 0;
    let cashRefunds = 0;
    let cashIn = 0;
    let cashOut = 0;
    let cashDeposits = 0;
    let cashWithdrawals = 0;

    for (const m of movements) {
      const amt = m.amount || 0;
      switch (m.movementType) {
        case 'OPENING_CASH':
          openingCash = amt;
          break;
        case 'CASH_SALE':
          cashSales = Math.round((cashSales + amt) * 100) / 100;
          break;
        case 'CUSTOMER_PAYMENT':
          customerCashReceipts = Math.round((customerCashReceipts + amt) * 100) / 100;
          break;
        case 'SUPPLIER_CASH_PAYMENT':
          supplierCashPayments = Math.round((supplierCashPayments + amt) * 100) / 100;
          break;
        case 'CASH_EXPENSE':
          cashExpenses = Math.round((cashExpenses + amt) * 100) / 100;
          break;
        case 'CASH_REFUND':
          cashRefunds = Math.round((cashRefunds + amt) * 100) / 100;
          break;
        case 'CASH_IN':
          cashIn = Math.round((cashIn + amt) * 100) / 100;
          break;
        case 'CASH_OUT':
          cashOut = Math.round((cashOut + amt) * 100) / 100;
          break;
        case 'CASH_DEPOSIT':
          cashDeposits = Math.round((cashDeposits + amt) * 100) / 100;
          break;
        case 'CASH_WITHDRAWAL':
          cashWithdrawals = Math.round((cashWithdrawals + amt) * 100) / 100;
          break;
      }
    }

    const inflows = openingCash + cashSales + customerCashReceipts + cashIn + cashWithdrawals;
    const outflows = supplierCashPayments + cashExpenses + cashRefunds + cashOut + cashDeposits;
    const expectedCash = Math.round((inflows - outflows) * 100) / 100;

    // Retrieve non-cash summary for the session timeframe
    const sessionStart = new Date(session.openedAt);
    const sessionEnd = session.closedAt ? new Date(session.closedAt) : new Date();

    const nonCashPayments = await this.prisma.salesPayment.findMany({
      where: {
        companyId,
        paymentMode: { not: 'CASH' },
        status: 'POSTED',
        createdAt: { gte: sessionStart, lte: sessionEnd },
      },
      select: { amount: true, paymentMode: true },
    });

    const nonCashSales = Math.round(
      nonCashPayments.reduce((sum, p) => sum + (p.amount || 0), 0) * 100,
    ) / 100;

    const nonCashExpRecords = await this.prisma.expense.findMany({
      where: {
        companyId,
        paymentMethod: { not: 'CASH' },
        status: 'POSTED',
        createdAt: { gte: sessionStart, lte: sessionEnd },
      },
      select: { amount: true },
    });

    const nonCashExpenses = Math.round(
      nonCashExpRecords.reduce((sum, e) => sum + (e.amount || 0), 0) * 100,
    ) / 100;

    return {
      session,
      cashRegister: register,
      openingCash,
      cashSales,
      customerCashReceipts,
      supplierCashPayments,
      cashExpenses,
      cashRefunds,
      cashIn,
      cashOut,
      cashDeposits,
      cashWithdrawals,
      expectedCash,
      nonCashSales,
      nonCashReceipts: nonCashSales,
      nonCashExpenses,
      movementCount: movements.length,
    };
  }

  // ─── Reopen Session ───────────────────────────────────────────────────────

  public async reopenSession(
    companyId: string,
    sessionId: string,
    param3: string,
    param4?: string,
  ): Promise<CashRegisterSession> {
    const reason = (param4 ? param4 : param3) || '';
    const userId = param4 ? param3 : undefined;
    if (!reason?.trim()) {
      throw new ValidationError('Reason is required to reopen a closed session.');
    }

    return this.prisma.$transaction(async (tx) => {
      const session = await tx.cashRegisterSession.findFirst({
        where: { id: sessionId, companyId },
        include: { cashRegister: true },
      });
      if (!session) {
        throw new NotFoundError('Cash register session not found.');
      }
      if (session.status === 'OPEN') {
        throw new BusinessRuleError('Session is already open.');
      }

      // Check if there is another OPEN session on this register
      const existingOpen = await tx.cashRegisterSession.findFirst({
        where: { companyId, cashRegisterId: session.cashRegisterId, status: 'OPEN' },
      });
      if (existingOpen) {
        throw new BusinessRuleError(
          `Cannot reopen session: register already has an active open session (${existingOpen.sessionNumber}).`,
        );
      }

      const reopened = await tx.cashRegisterSession.update({
        where: { id: sessionId },
        data: {
          status: 'OPEN',
          closedBy: null,
          closedAt: null,
          countedCash: null,
          cashDifference: null,
          closingNotes: `${session.closingNotes || ''}\n[REOPENED on ${new Date().toISOString()} by ${userId || 'admin'}]: ${reason.trim()}`,
        },
        include: { cashRegister: true },
      });

      await this.auditService.log(
        {
          companyId,
          userId: userId || null,
          action: 'REGISTER_SESSION_REOPENED',
          module: 'CASH_REGISTER',
          referenceId: sessionId,
          newValue: JSON.stringify({ reason: reason.trim() }),
        },
        tx,
      );

      return reopened as unknown as CashRegisterSession;
    });
  }
}
