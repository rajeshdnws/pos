import { PrismaClient } from '@prisma/client';
import {
  DateRangeFilter,
  ExpenseReportFilters,
  ExpenseSummaryReport,
  ExpenseSummaryRow,
  CashbookReportSummary,
  CashbookReportRow,
  RegisterClosingReportRow,
} from '@rs-inventory/types';
import {
  resolveDateRange,
  roundCurrency,
} from '../repositories/reporting.repository.js';

export class CashReportService {
  constructor(private readonly prisma: PrismaClient) {}

  // ── Expense Summary Report ───────────────────────────────────────────────────

  public async getExpenseSummary(
    companyId: string,
    filters: ExpenseReportFilters = {},
  ): Promise<ExpenseSummaryReport> {
    const range = resolveDateRange(filters);

    const expenses = await this.prisma.expense.findMany({
      where: {
        companyId,
        status: 'POSTED',
        expenseDate: { gte: range.gte, lte: range.lte },
        ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
        ...(filters.paymentMethod ? { paymentMethod: filters.paymentMethod } : {}),
      },
      select: {
        categoryId: true,
        categoryNameSnapshot: true,
        amount: true,
        paymentMethod: true,
      },
    });

    const catMap = new Map<string, { name: string; count: number; total: number; cash: number; nonCash: number }>();

    for (const exp of expenses) {
      const existing = catMap.get(exp.categoryId) ?? {
        name: exp.categoryNameSnapshot || 'Uncategorised',
        count: 0, total: 0, cash: 0, nonCash: 0,
      };
      existing.count++;
      existing.total += exp.amount;
      if (exp.paymentMethod === 'CASH') {
        existing.cash += exp.amount;
      } else {
        existing.nonCash += exp.amount;
      }
      catMap.set(exp.categoryId, existing);
    }

    const rows: ExpenseSummaryRow[] = Array.from(catMap.entries())
      .map(([categoryId, data]) => ({
        categoryId,
        categoryName: data.name,
        expenseCount: data.count,
        totalAmount: roundCurrency(data.total),
        cashAmount: roundCurrency(data.cash),
        nonCashAmount: roundCurrency(data.nonCash),
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    const totalExpenses = roundCurrency(rows.reduce((s, r) => s + r.totalAmount, 0));
    const totalCash = roundCurrency(rows.reduce((s, r) => s + r.cashAmount, 0));
    const totalNonCash = roundCurrency(rows.reduce((s, r) => s + r.nonCashAmount, 0));

    return {
      rows,
      totalExpenses,
      totalCash,
      totalNonCash,
      startDate: range.startDateStr,
      endDate: range.endDateStr,
    };
  }

  // ── Cashbook Report ──────────────────────────────────────────────────────────

  public async getCashbookReport(
    companyId: string,
    filters: DateRangeFilter = {},
  ): Promise<CashbookReportSummary> {
    const range = resolveDateRange(filters);

    const movements = await this.prisma.cashMovement.findMany({
      where: {
        companyId,
        movementDate: { gte: range.gte, lte: range.lte },
      },
      orderBy: { movementDate: 'asc' },
      select: {
        id: true,
        movementDate: true,
        movementType: true,
        referenceNumber: true,
        description: true,
        amount: true,
        cashRegisterSession: { select: { sessionNumber: true } },
      },
    });

    // Cash-in movement types (matches existing convention in financial-dashboard.service)
    const inflowTypes = new Set([
      'OPENING_CASH', 'CASH_SALE', 'CUSTOMER_PAYMENT', 'CASH_IN', 'CASH_WITHDRAWAL',
    ]);

    let runningBalance = 0;
    let totalCashIn = 0;
    let totalCashOut = 0;
    const openingBalance = 0; // Could be enhanced to look at previous period's closing

    const rows: CashbookReportRow[] = movements.map((m) => {
      const isIn = inflowTypes.has(m.movementType);
      const cashIn = isIn ? roundCurrency(m.amount) : 0;
      const cashOut = !isIn ? roundCurrency(m.amount) : 0;
      runningBalance = roundCurrency(runningBalance + cashIn - cashOut);
      totalCashIn += cashIn;
      totalCashOut += cashOut;

      return {
        id: m.id,
        movementDate: m.movementDate,
        movementType: m.movementType,
        referenceNumber: m.referenceNumber,
        description: m.description,
        cashIn,
        cashOut,
        runningBalance,
        sessionNumber: m.cashRegisterSession?.sessionNumber ?? null,
      };
    });

    return {
      rows,
      openingBalance,
      totalCashIn: roundCurrency(totalCashIn),
      totalCashOut: roundCurrency(totalCashOut),
      closingBalance: runningBalance,
      startDate: range.startDateStr,
      endDate: range.endDateStr,
    };
  }

  // ── Register Closing Report ──────────────────────────────────────────────────

  public async getRegisterClosings(
    companyId: string,
    filters: DateRangeFilter = {},
  ): Promise<RegisterClosingReportRow[]> {
    const range = resolveDateRange(filters);

    const closings = await this.prisma.dayEndClosing.findMany({
      where: {
        companyId,
        businessDate: { gte: range.gte, lte: range.lte },
      },
      orderBy: { businessDate: 'desc' },
      select: {
        id: true,
        closingNumber: true,
        businessDate: true,
        openingCash: true,
        cashSales: true,
        customerCashReceipts: true,
        supplierCashPayments: true,
        cashExpenses: true,
        cashRefunds: true,
        cashIn: true,
        cashOut: true,
        expectedCash: true,
        countedCash: true,
        cashDifference: true,
        closedBy: true,
        closedAt: true,
        cashRegister: { select: { name: true } },
        cashRegisterSession: { select: { sessionNumber: true } },
      },
    });

    return closings.map((c) => {
      const diff = c.cashDifference;
      let status: 'MATCHED' | 'SURPLUS' | 'SHORTAGE' = 'MATCHED';
      if (diff > 0.01) status = 'SURPLUS';
      else if (diff < -0.01) status = 'SHORTAGE';

      return {
        id: c.id,
        closingNumber: c.closingNumber,
        businessDate: c.businessDate,
        registerName: c.cashRegister.name,
        sessionNumber: c.cashRegisterSession.sessionNumber,
        openingCash: c.openingCash,
        cashSales: c.cashSales,
        customerCashReceipts: c.customerCashReceipts,
        supplierCashPayments: c.supplierCashPayments,
        cashExpenses: c.cashExpenses,
        cashRefunds: c.cashRefunds,
        cashIn: c.cashIn,
        cashOut: c.cashOut,
        expectedCash: c.expectedCash,
        countedCash: c.countedCash,
        cashDifference: c.cashDifference,
        closedBy: c.closedBy,
        closedAt: c.closedAt,
        status,
      };
    });
  }
}
