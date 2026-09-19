import { PrismaClient } from '@prisma/client';
import {
  Expense,
  ExpenseCreateDTO,
  ExpenseFilterDTO,
  ExpenseUpdateDTO,
  PaginatedResult,
} from '@rs-inventory/types';
import { BusinessRuleError, NotFoundError, ValidationError } from '../errors/app.error.js';
import { ExpenseCategoryRepository } from '../repositories/expense-category.repository.js';
import { ExpenseRepository } from '../repositories/expense.repository.js';
import { AuditService } from './audit.service.js';
import { SequenceService } from './sequence.service.js';

export class ExpenseService {
  private repo: ExpenseRepository;
  private categoryRepo: ExpenseCategoryRepository;
  private sequenceService: SequenceService;
  private auditService: AuditService;

  constructor(private readonly prisma: PrismaClient) {
    this.repo = new ExpenseRepository(prisma);
    this.categoryRepo = new ExpenseCategoryRepository(prisma);
    this.sequenceService = new SequenceService(prisma);
    this.auditService = new AuditService(prisma);
  }

  public async listExpenses(
    companyId: string,
    filters: ExpenseFilterDTO = {},
  ): Promise<PaginatedResult<Expense>> {
    return this.repo.findMany(companyId, filters);
  }

  public async getExpense(companyId: string, id: string): Promise<Expense | null> {
    return this.repo.findById(id, companyId);
  }

  public async createExpense(
    companyId: string,
    dto: ExpenseCreateDTO,
    userId?: string,
  ): Promise<Expense> {
    return this.createDraft(companyId, dto, userId);
  }

  public async createDraft(
    companyId: string,
    dto: ExpenseCreateDTO,
    userId?: string,
  ): Promise<Expense> {
    const amount = Math.round((Number(dto.amount) || 0) * 100) / 100;
    if (amount <= 0) {
      throw new ValidationError('Expense amount must be greater than zero.');
    }
    if (!dto.description?.trim()) {
      throw new ValidationError('Expense description is required.');
    }
    if (!dto.categoryId) {
      throw new ValidationError('Expense category is required.');
    }

    const category = await this.categoryRepo.findById(dto.categoryId);
    if (!category || category.companyId !== companyId) {
      throw new NotFoundError('Expense category not found.');
    }
    if (!category.isActive) {
      throw new BusinessRuleError(`Expense category "${category.name}" is inactive and cannot be used.`);
    }

    return this.prisma.$transaction(async (tx) => {
      const expenseNumber = await this.sequenceService.getNextNumber(companyId, 'EXP', 6, tx);

      const expense = await tx.expense.create({
        data: {
          companyId,
          expenseNumber,
          categoryId: dto.categoryId,
          categoryNameSnapshot: category.name,
          expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : new Date(),
          description: dto.description.trim(),
          payee: dto.payee?.trim() || (dto as any).paidTo?.trim() || null,
          amount,
          paymentMethod: dto.paymentMethod || 'CASH',
          paymentAccountId: dto.paymentAccountId || null,
          referenceNumber: dto.referenceNumber?.trim() || null,
          receiptReference: dto.receiptReference?.trim() || null,
          notes: dto.notes?.trim() || null,
          status: 'DRAFT',
          createdBy: userId || null,
        },
        include: {
          category: true,
          cashRegisterSession: true,
        },
      });

      await this.auditService.log(
        {
          companyId,
          userId: userId || null,
          action: 'EXPENSE_DRAFT_CREATED',
          module: 'EXPENSES',
          referenceId: expense.id,
          newValue: JSON.stringify({ expenseNumber, amount, category: category.name }),
        },
        tx,
      );

      if (dto.postImmediately) {
        return this.postExpenseInternal(companyId, expense.id, userId, tx);
      }

      return expense as unknown as Expense;
    });
  }

  public async updateDraft(
    companyId: string,
    id: string,
    dto: ExpenseUpdateDTO,
    userId?: string,
  ): Promise<Expense> {
    const existing = await this.repo.findById(id, companyId);
    if (!existing) {
      throw new NotFoundError('Expense not found.');
    }
    if (existing.status !== 'DRAFT') {
      throw new BusinessRuleError('Only draft expenses can be modified.');
    }

    if (dto.amount !== undefined) {
      const amount = Math.round(Number(dto.amount) * 100) / 100;
      if (amount <= 0) {
        throw new ValidationError('Expense amount must be greater than zero.');
      }
    }

    let categoryNameSnapshot = existing.categoryNameSnapshot;
    if (dto.categoryId && dto.categoryId !== existing.categoryId) {
      const cat = await this.categoryRepo.findById(dto.categoryId);
      if (!cat || cat.companyId !== companyId) {
        throw new NotFoundError('Expense category not found.');
      }
      if (!cat.isActive) {
        throw new BusinessRuleError(`Expense category "${cat.name}" is inactive.`);
      }
      categoryNameSnapshot = cat.name;
    }

    const updated = await this.repo.update(id, {
      categoryId: dto.categoryId || existing.categoryId,
      categoryNameSnapshot,
      expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : existing.expenseDate,
      description: dto.description !== undefined ? dto.description.trim() : existing.description,
      payee: dto.payee !== undefined ? (dto.payee?.trim() || null) : ((dto as any).paidTo !== undefined ? ((dto as any).paidTo?.trim() || null) : existing.payee),
      amount: dto.amount !== undefined ? Math.round(Number(dto.amount) * 100) / 100 : existing.amount,
      paymentMethod: dto.paymentMethod || existing.paymentMethod,
      paymentAccountId: dto.paymentAccountId !== undefined ? dto.paymentAccountId || null : existing.paymentAccountId,
      referenceNumber: dto.referenceNumber !== undefined ? dto.referenceNumber?.trim() || null : existing.referenceNumber,
      receiptReference: dto.receiptReference !== undefined ? dto.receiptReference?.trim() || null : existing.receiptReference,
      notes: dto.notes !== undefined ? dto.notes?.trim() || null : existing.notes,
      updatedBy: userId || null,
    });

    await this.auditService.log({
      companyId,
      userId: userId || null,
      action: 'EXPENSE_DRAFT_UPDATED',
      module: 'EXPENSES',
      referenceId: id,
      newValue: JSON.stringify(dto),
    });

    return updated;
  }

  public async postExpense(
    companyId: string,
    id: string,
    userId?: string,
  ): Promise<Expense> {
    return this.prisma.$transaction(async (tx) => {
      return this.postExpenseInternal(companyId, id, userId, tx);
    });
  }

  private async postExpenseInternal(
    companyId: string,
    id: string,
    userId?: string,
    tx?: any,
  ): Promise<Expense> {
    const client = tx || this.prisma;
    const expense = await client.expense.findFirst({
      where: { id, companyId },
    });
    if (!expense) throw new NotFoundError('Expense not found.');
    if (expense.status === 'POSTED') {
      throw new BusinessRuleError('This expense has already been posted.');
    }
    if (expense.status === 'CANCELLED') {
      throw new BusinessRuleError('Cancelled expenses cannot be posted.');
    }

    let sessionId: string | null = null;

    // If CASH expense, must affect active cash register session
    if (expense.paymentMethod === 'CASH') {
      const activeSession = await client.cashRegisterSession.findFirst({
        where: { companyId, status: 'OPEN' },
        orderBy: { openedAt: 'desc' },
      });

      if (!activeSession) {
        throw new BusinessRuleError(
          'An active cash register session is required to post a cash expense. Please open a register session first.',
        );
      }

      sessionId = activeSession.id;

      // Create CASH_EXPENSE movement
      const movNumber = await this.sequenceService.getNextNumber(companyId, 'MOV', 6, client);
      await client.cashMovement.create({
        data: {
          companyId,
          cashRegisterId: activeSession.cashRegisterId,
          cashRegisterSessionId: activeSession.id,
          movementNumber: movNumber,
          movementType: 'CASH_EXPENSE',
          amount: expense.amount,
          movementDate: expense.expenseDate,
          referenceType: 'EXPENSE',
          referenceId: expense.id,
          referenceNumber: expense.expenseNumber,
          description: `Expense: ${expense.expenseNumber} — ${expense.description}`,
          expenseId: expense.id,
          createdBy: userId || null,
        },
      });
    }

    const posted = await client.expense.update({
      where: { id },
      data: {
        status: 'POSTED',
        cashRegisterSessionId: sessionId,
        postedBy: userId || null,
        postedAt: new Date(),
        updatedBy: userId || null,
      },
      include: {
        category: true,
        cashRegisterSession: true,
      },
    });

    await this.auditService.log(
      {
        companyId,
        userId: userId || null,
        action: 'EXPENSE_POSTED',
        module: 'EXPENSES',
        referenceId: id,
        newValue: JSON.stringify({
          expenseNumber: expense.expenseNumber,
          amount: expense.amount,
          paymentMethod: expense.paymentMethod,
        }),
      },
      client,
    );

    return posted as unknown as Expense;
  }

  public async cancelDraft(
    companyId: string,
    id: string,
    userId?: string,
  ): Promise<Expense> {
    const expense = await this.repo.findById(id, companyId);
    if (!expense) throw new NotFoundError('Expense not found.');
    if (expense.status !== 'DRAFT') {
      throw new BusinessRuleError('Only draft expenses can be cancelled.');
    }

    const cancelled = await this.repo.update(id, {
      status: 'CANCELLED',
      updatedBy: userId || null,
    });

    await this.auditService.log({
      companyId,
      userId: userId || null,
      action: 'EXPENSE_DRAFT_CANCELLED',
      module: 'EXPENSES',
      referenceId: id,
      newValue: JSON.stringify({ expenseNumber: expense.expenseNumber }),
    });

    return cancelled;
  }

  public async updateDraftExpense(
    companyId: string,
    id: string,
    dto: ExpenseUpdateDTO,
    userId?: string,
  ): Promise<Expense> {
    return this.updateDraft(companyId, id, dto, userId);
  }

  public async cancelDraftExpense(
    companyId: string,
    id: string,
    userId?: string,
  ): Promise<Expense> {
    return this.cancelDraft(companyId, id, userId);
  }
}
