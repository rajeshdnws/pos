import { PrismaClient } from '@prisma/client';
import { FinancialDashboardKPIs } from '@rs-inventory/types';
import { CashRegisterService } from './cash-register.service.js';

export class FinancialDashboardService {
  private registerService: CashRegisterService;

  constructor(private readonly prisma: PrismaClient) {
    this.registerService = new CashRegisterService(prisma);
  }

  public async getKPIs(companyId: string): Promise<FinancialDashboardKPIs> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // 1. Expenses Today & Month
    const [expensesTodayAgg, expensesMonthAgg] = await Promise.all([
      this.prisma.expense.aggregate({
        where: {
          companyId,
          status: 'POSTED',
          expenseDate: { gte: today },
        },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: {
          companyId,
          status: 'POSTED',
          expenseDate: { gte: firstOfMonth },
        },
        _sum: { amount: true },
      }),
    ]);

    const expensesToday = Math.round((expensesTodayAgg._sum.amount || 0) * 100) / 100;
    const expensesThisMonth = Math.round((expensesMonthAgg._sum.amount || 0) * 100) / 100;

    // 2. Cash In & Out Today
    const todayMovements = await this.prisma.cashMovement.findMany({
      where: {
        companyId,
        movementDate: { gte: today },
      },
      select: { amount: true, movementType: true },
    });

    const inflowTypes = ['OPENING_CASH', 'CASH_SALE', 'CUSTOMER_PAYMENT', 'CASH_IN', 'CASH_WITHDRAWAL'];

    let cashReceivedToday = 0;
    let cashPaidToday = 0;

    for (const m of todayMovements) {
      if (inflowTypes.includes(m.movementType)) {
        cashReceivedToday = Math.round((cashReceivedToday + (m.amount || 0)) * 100) / 100;
      } else {
        cashPaidToday = Math.round((cashPaidToday + (m.amount || 0)) * 100) / 100;
      }
    }

    // 3. Active session & unclosed count
    const activeSession = await this.registerService.getActiveSession(companyId);
    let currentExpectedCash = 0;
    if (activeSession) {
      const summary = await this.registerService.getSessionSummary(companyId, activeSession.id);
      currentExpectedCash = summary.expectedCash;
    }

    const unclosedSessionsCount = await this.prisma.cashRegisterSession.count({
      where: { companyId, status: 'OPEN' },
    });

    // 4. Recent difference
    const latestClosing = await this.prisma.dayEndClosing.findFirst({
      where: { companyId },
      orderBy: { closedAt: 'desc' },
      select: { cashDifference: true },
    });
    const recentDifference = latestClosing ? (latestClosing.cashDifference || 0) : 0;

    return {
      expensesToday,
      expensesThisMonth,
      cashReceivedToday,
      cashPaidToday,
      currentExpectedCash,
      unclosedSessionsCount,
      activeSessionId: activeSession?.id || null,
      recentDifference,
    };
  }
}
