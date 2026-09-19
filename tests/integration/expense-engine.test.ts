import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CompanyService } from '../../packages/business/src/services/company.service';
import { ExpenseCategoryService } from '../../packages/business/src/services/expense-category.service';
import { ExpenseService } from '../../packages/business/src/services/expense.service';
import { CashRegisterService } from '../../packages/business/src/services/cash-register.service';
import { ExpensePaymentMethod, ExpenseStatus, CashMovementType } from '@rs-inventory/types';
import { createTestDatabase } from '../helpers/test-db';

describe('Expense Management Engine Integration Tests', () => {
  let cleanupFn: () => Promise<void>;
  let prisma: any;
  let companyService: CompanyService;
  let expenseCategoryService: ExpenseCategoryService;
  let expenseService: ExpenseService;
  let cashRegisterService: CashRegisterService;

  let companyAId: string;
  let userAId: string;
  let companyBId: string;
  let userBId: string;
  let registerAId: string;

  beforeAll(async () => {
    const { dbService, cleanup } = await createTestDatabase();
    cleanupFn = cleanup;
    prisma = dbService.getClient();

    companyService = new CompanyService(prisma);
    expenseCategoryService = new ExpenseCategoryService(prisma);
    expenseService = new ExpenseService(prisma);
    cashRegisterService = new CashRegisterService(prisma);

    // Setup Company A
    const setupA = await companyService.setupCompanyAndAdmin({
      businessName: 'Apex Electronics Delhi',
      adminFullName: 'Apex Admin',
      adminUsername: 'apexadmin',
      adminPassword: 'Password123!',
      gstRegistered: true,
      gstin: '07AAAAA1111A1Z1',
      state: 'Delhi',
    });
    companyAId = setupA.company.id;
    userAId = setupA.user.id;

    // Get Company A Default Register
    const regList = await cashRegisterService.listRegisters(companyAId);
    expect(regList.length).toBeGreaterThan(0);
    registerAId = regList[0].id;

    // Setup Company B directly (for isolation tests)
    const companyB = await prisma.company.create({
      data: {
        name: 'Beta Enterprises Punjab',
        isActive: true,
      },
    });
    companyBId = companyB.id;

    const userB = await prisma.user.create({
      data: {
        companyId: companyBId,
        username: 'betaadmin',
        passwordHash: 'dummy_hash',
        name: 'Beta Admin',
        isActive: true,
      },
    });
    userBId = userB.id;

    // Seed categories for Company B
    await expenseCategoryService.seedDefaultCategories(companyBId, userBId);
  });

  afterAll(async () => {
    if (cleanupFn) {
      await cleanupFn();
    }
  });

  describe('1. Expense Categories Management', () => {
    it('should have seeded standard expense categories for Company A upon setup', async () => {
      const categories = await expenseCategoryService.listCategories(companyAId);
      expect(categories.length).toBeGreaterThanOrEqual(9);

      const names = categories.map((c) => c.name);
      expect(names).toContain('Rent');
      expect(names).toContain('Electricity & Utilities');
      expect(names).toContain('Staff Salaries & Wages');
      expect(names).toContain('Tea, Refreshments & Pantry');
      expect(names).toContain('Miscellaneous Expenses');
    });

    it('should allow creating a custom expense category with unique name', async () => {
      const customCat = await expenseCategoryService.createCategory(
        companyAId,
        {
          name: 'Security Guard Services',
          description: 'Monthly agency payment for security guards',
        },
        userAId,
      );

      expect(customCat.id).toBeDefined();
      expect(customCat.name).toBe('Security Guard Services');

      // Attempt duplicate name
      await expect(
        expenseCategoryService.createCategory(
          companyAId,
          { name: 'security guard services' },
          userAId,
        ),
      ).rejects.toThrow(/already exists/i);
    });

    it('should protect categories referenced by expenses from deletion', async () => {
      const categories = await expenseCategoryService.listCategories(companyAId);
      const cat = categories[0];

      // Create an expense referencing this category
      await expenseService.createExpense(
        companyAId,
        {
          categoryId: cat.id,
          amount: 500,
          paymentMethod: ExpensePaymentMethod.CASH,
          expenseDate: new Date(),
          description: 'Office tea supply',
        },
        userAId,
      );

      // Trying to delete category should fail
      await expect(
        expenseCategoryService.deleteCategory(companyAId, cat.id),
      ).rejects.toThrow(/cannot delete/i);
    });
  });

  describe('2. Expense Lifecycle: Draft, Validation, Posting & Cancellation', () => {
    let testCategoryId: string;

    beforeAll(async () => {
      const categories = await expenseCategoryService.listCategories(companyAId);
      testCategoryId = categories.find((c) => c.name === 'Tea, Refreshments & Pantry')?.id || categories[0].id;
    });

    it('should create an expense in DRAFT status with EXP sequence', async () => {
      const expense = await expenseService.createExpense(
        companyAId,
        {
          categoryId: testCategoryId,
          amount: 450,
          paymentMethod: ExpensePaymentMethod.CASH,
          expenseDate: new Date(),
          description: 'Pantry coffee and sugar purchase',
          paidTo: 'Local Mart',
        },
        userAId,
      );

      expect(expense.id).toBeDefined();
      expect(expense.expenseNumber).toMatch(/^EXP-\d{6}$/);
      expect(expense.status).toBe(ExpenseStatus.DRAFT);
      expect(expense.amount).toBe(450);
      expect(expense.payee).toBe('Local Mart');
    });

    it('should reject creating expense with zero or negative amount', async () => {
      await expect(
        expenseService.createExpense(
          companyAId,
          {
            categoryId: testCategoryId,
            amount: 0,
            paymentMethod: ExpensePaymentMethod.CASH,
            expenseDate: new Date(),
          },
          userAId,
        ),
      ).rejects.toThrow(/greater than zero/i);

      await expect(
        expenseService.createExpense(
          companyAId,
          {
            categoryId: testCategoryId,
            amount: -100,
            paymentMethod: ExpensePaymentMethod.CASH,
            expenseDate: new Date(),
          },
          userAId,
        ),
      ).rejects.toThrow(/greater than zero/i);
    });

    it('should allow updating draft expense details', async () => {
      const expense = await expenseService.createExpense(
        companyAId,
        {
          categoryId: testCategoryId,
          amount: 250,
          paymentMethod: ExpensePaymentMethod.UPI,
          expenseDate: new Date(),
          description: 'Draft notes',
        },
        userAId,
      );

      const updated = await expenseService.updateDraftExpense(
        companyAId,
        expense.id,
        {
          amount: 320,
          description: 'Corrected pantry notes',
          referenceNumber: 'UPI-REF-9988',
        },
        userAId,
      );

      expect(updated.amount).toBe(320);
      expect(updated.description).toBe('Corrected pantry notes');
      expect(updated.referenceNumber).toBe('UPI-REF-9988');
    });

    it('should allow cancelling a draft expense', async () => {
      const expense = await expenseService.createExpense(
        companyAId,
        {
          categoryId: testCategoryId,
          amount: 150,
          paymentMethod: ExpensePaymentMethod.CASH,
          expenseDate: new Date(),
          description: 'Mistakenly entered item',
        },
        userAId,
      );

      const cancelled = await expenseService.cancelDraftExpense(companyAId, expense.id, userAId);
      expect(cancelled.status).toBe(ExpenseStatus.CANCELLED);

      // Attempting to post cancelled expense should fail
      await expect(
        expenseService.postExpense(companyAId, expense.id, userAId),
      ).rejects.toThrow(/cancelled|draft/i);
    });

    it('should post non-cash expense without creating cash register movement', async () => {
      const expense = await expenseService.createExpense(
        companyAId,
        {
          categoryId: testCategoryId,
          amount: 1200,
          paymentMethod: ExpensePaymentMethod.BANK_TRANSFER,
          expenseDate: new Date(),
          description: 'Internet bill bank payment',
          referenceNumber: 'NEFT-55441',
        },
        userAId,
      );

      const posted = await expenseService.postExpense(companyAId, expense.id, userAId);
      expect(posted.status).toBe(ExpenseStatus.POSTED);
      expect(posted.postedAt).toBeDefined();

      // Check no cash movement was created for this non-cash expense
      const movements = await prisma.cashMovement.findMany({
        where: { referenceId: expense.id },
      });
      expect(movements.length).toBe(0);
    });

    it('should post cash expense and record CASH_EXPENSE movement if register session is open', async () => {
      // 1. Open a session on register A
      const session = await cashRegisterService.openSession(
        companyAId,
        { cashRegisterId: registerAId, openingCash: 1000, openingNotes: 'Morning opening float' },
        userAId,
      );
      expect(session.id).toBeDefined();

      // 2. Create cash expense
      const expense = await expenseService.createExpense(
        companyAId,
        {
          categoryId: testCategoryId,
          amount: 350,
          paymentMethod: ExpensePaymentMethod.CASH,
          expenseDate: new Date(),
          description: 'Emergency drawer cash used for stationery',
        },
        userAId,
      );

      // 3. Post cash expense
      const posted = await expenseService.postExpense(companyAId, expense.id, userAId);
      expect(posted.status).toBe(ExpenseStatus.POSTED);

      // 4. Verify CashMovement record exists under this session
      const movement = await prisma.cashMovement.findFirst({
        where: {
          companyId: companyAId,
          referenceId: expense.id,
          movementType: CashMovementType.CASH_EXPENSE,
        },
      });
      expect(movement).not.toBeNull();
      expect(movement!.amount).toBe(350);
      expect(movement!.cashRegisterSessionId).toBe(session.id);

      // 5. Verify session summary shows cash expense
      const summary = await cashRegisterService.getSessionSummary(companyAId, session.id);
      expect(summary.cashExpenses).toBe(350);
      expect(summary.expectedCash).toBe(1000 - 350); // Opening - Expense = 650
    });

    it('should prevent modifying an already posted expense', async () => {
      const expenses = await expenseService.listExpenses(companyAId, { status: ExpenseStatus.POSTED });
      expect(expenses.items.length).toBeGreaterThan(0);
      const postedExpense = expenses.items[0];

      await expect(
        expenseService.updateDraftExpense(
          companyAId,
          postedExpense.id,
          { amount: 9999 },
          userAId,
        ),
      ).rejects.toThrow(/only draft/i);
    });
  });

  describe('3. Multi-Company Isolation', () => {
    it('should isolate expenses and categories strictly per company', async () => {
      const catA = await expenseCategoryService.listCategories(companyAId);
      const catB = await expenseCategoryService.listCategories(companyBId);

      expect(catA.every((c) => c.companyId === companyAId)).toBe(true);
      expect(catB.every((c) => c.companyId === companyBId)).toBe(true);

      const expA = await expenseService.listExpenses(companyAId);
      const expB = await expenseService.listExpenses(companyBId);

      expect(expA.items.every((e) => e.companyId === companyAId)).toBe(true);
      expect(expB.items.every((e) => e.companyId === companyBId)).toBe(true);
      expect(expB.items.length).toBe(0); // Company B has no expenses
    });
  });
});
