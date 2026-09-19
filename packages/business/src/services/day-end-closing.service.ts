import { PrismaClient } from '@prisma/client';
import {
  CashRegisterCloseSessionDTO,
  DayEndClosing,
  DayEndClosingFilterDTO,
  DayEndClosingPreview,
  PaginatedResult,
} from '@rs-inventory/types';
import { BusinessRuleError, ValidationError } from '../errors/app.error.js';
import { DayEndClosingRepository } from '../repositories/day-end-closing.repository.js';
import { AuditService } from './audit.service.js';
import { CashRegisterService } from './cash-register.service.js';
import { SequenceService } from './sequence.service.js';

export class DayEndClosingService {
  private closingRepo: DayEndClosingRepository;
  private registerService: CashRegisterService;
  private sequenceService: SequenceService;
  private auditService: AuditService;

  constructor(private readonly prisma: PrismaClient) {
    this.closingRepo = new DayEndClosingRepository(prisma);
    this.registerService = new CashRegisterService(prisma);
    this.sequenceService = new SequenceService(prisma);
    this.auditService = new AuditService(prisma);
  }

  public async preview(companyId: string, sessionId?: string): Promise<DayEndClosingPreview> {
    return this.registerService.getSessionSummary(companyId, sessionId);
  }

  public async getClosingPreview(companyId: string, sessionId?: string): Promise<DayEndClosingPreview> {
    return this.preview(companyId, sessionId);
  }

  public async performDayEndClosing(
    companyId: string,
    dto: CashRegisterCloseSessionDTO,
    userId?: string,
  ): Promise<DayEndClosing> {
    return this.closeSession(companyId, dto, userId);
  }

  public async closeSession(
    companyId: string,
    dto: CashRegisterCloseSessionDTO,
    userId?: string,
  ): Promise<DayEndClosing> {
    const countedCash = Math.round((Number(dto.countedCash) || 0) * 100) / 100;
    if (countedCash < 0) {
      throw new ValidationError('Counted cash cannot be negative.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Re-fetch active open session with lock
      const session = await tx.cashRegisterSession.findFirst({
        where: { companyId, status: 'OPEN' },
        include: { cashRegister: true },
        orderBy: { openedAt: 'desc' },
      });

      if (!session) {
        throw new BusinessRuleError('No open cash register session found to close.');
      }

      // 2. Fetch all movements for this session to recalculate expected cash atomically
      const movements = await tx.cashMovement.findMany({
        where: { cashRegisterSessionId: session.id },
      });

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
      const cashDifference = Math.round((countedCash - expectedCash) * 100) / 100;

      // Validate difference explanation
      const noteProvided = dto.closingNotes?.trim() || (dto as any).notes?.trim();
      if (Math.abs(cashDifference) > 0.01 && !noteProvided) {
        const diffDesc = cashDifference > 0 ? `surplus of ₹${cashDifference}` : `shortage of ₹${Math.abs(cashDifference)}`;
        throw new ValidationError(
          `A cash discrepancy (${diffDesc}) was detected between counted cash (₹${countedCash}) and expected cash (₹${expectedCash}). A closing explanation/note is mandatory.`,
        );
      }

      // Gather non-cash totals
      const sessionStart = new Date(session.openedAt);
      const sessionEnd = new Date();

      const nonCashPayments = await tx.salesPayment.findMany({
        where: {
          companyId,
          paymentMode: { not: 'CASH' },
          status: 'POSTED',
          createdAt: { gte: sessionStart, lte: sessionEnd },
        },
        select: { amount: true },
      });
      const nonCashSales = Math.round(
        nonCashPayments.reduce((sum, p) => sum + (p.amount || 0), 0) * 100,
      ) / 100;

      const nonCashExp = await tx.expense.findMany({
        where: {
          companyId,
          paymentMethod: { not: 'CASH' },
          status: 'POSTED',
          createdAt: { gte: sessionStart, lte: sessionEnd },
        },
        select: { amount: true },
      });
      const nonCashExpenses = Math.round(
        nonCashExp.reduce((sum, e) => sum + (e.amount || 0), 0) * 100,
      ) / 100;

      // 3. Generate closing number
      const closingNumber = await this.sequenceService.getNextNumber(companyId, 'CLS', 6, tx);

      // 4. Create Day-End Closing snapshot record
      const closingRecord = await tx.dayEndClosing.create({
        data: {
          companyId,
          cashRegisterId: session.cashRegisterId,
          cashRegisterSessionId: session.id,
          closingNumber,
          businessDate: new Date(),
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
          countedCash,
          cashDifference,
          nonCashSales,
          nonCashReceipts: nonCashSales,
          nonCashExpenses,
          notes: dto.closingNotes?.trim() || (dto as any).notes?.trim() || null,
          status: 'CLOSED',
          closedBy: userId || null,
          closedAt: new Date(),
        },
        include: {
          cashRegister: true,
          cashRegisterSession: true,
        },
      });

      // 5. Update session to CLOSED
      await tx.cashRegisterSession.update({
        where: { id: session.id },
        data: {
          status: 'CLOSED',
          expectedCash,
          countedCash,
          cashDifference,
          closedBy: userId || null,
          closedAt: new Date(),
          closingNotes: dto.closingNotes?.trim() || null,
        },
      });

      // 6. Audit log
      await this.auditService.log(
        {
          companyId,
          userId: userId || null,
          action: 'DAY_END_CLOSING_COMPLETED',
          module: 'DAY_END_CLOSING',
          referenceId: closingRecord.id,
          newValue: JSON.stringify({
            closingNumber,
            sessionNumber: session.sessionNumber,
            expectedCash,
            countedCash,
            cashDifference,
          }),
        },
        tx,
      );

      return closingRecord as unknown as DayEndClosing;
    });
  }

  public async getDayEndClosing(companyId: string, id: string): Promise<DayEndClosing | null> {
    return this.closingRepo.findById(id, companyId);
  }

  public async listDayEndClosings(
    companyId: string,
    filters: DayEndClosingFilterDTO = {},
  ): Promise<PaginatedResult<DayEndClosing>> {
    return this.closingRepo.findMany(companyId, filters);
  }
}
