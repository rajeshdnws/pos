import { PrismaClient } from '@prisma/client';
import {
  ExpenseCategory,
  ExpenseCategoryCreateDTO,
  ExpenseCategoryUpdateDTO,
} from '@rs-inventory/types';
import { ConflictError, NotFoundError, BusinessRuleError, ValidationError } from '../errors/app.error.js';
import { ExpenseCategoryRepository } from '../repositories/expense-category.repository.js';
import { AuditService } from './audit.service.js';

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Rent',
  'Electricity & Utilities',
  'Staff Salaries & Wages',
  'Tea, Refreshments & Pantry',
  'Freight & Transport',
  'Packaging Materials',
  'Office Supplies',
  'Repair & Maintenance',
  'Marketing & Advertising',
  'Bank Charges & Fees',
  'Miscellaneous Expenses',
];

export class ExpenseCategoryService {
  private repo: ExpenseCategoryRepository;
  private auditService: AuditService;

  constructor(prisma: PrismaClient) {
    this.repo = new ExpenseCategoryRepository(prisma);
    this.auditService = new AuditService(prisma);
  }

  public async listCategories(
    companyId: string,
    includeInactive: boolean = false,
  ): Promise<ExpenseCategory[]> {
    return this.repo.findAll(companyId, includeInactive);
  }

  public async createCategory(
    companyId: string,
    dto: ExpenseCategoryCreateDTO,
    userId?: string,
  ): Promise<ExpenseCategory> {
    const name = dto.name?.trim();
    if (!name) {
      throw new ValidationError('Category name is required.');
    }

    const existing = await this.repo.findByName(companyId, name);
    if (existing) {
      throw new ConflictError(`Expense category "${name}" already exists.`);
    }

    const created = await this.repo.create(companyId, dto, userId);

    await this.auditService.log({
      companyId,
      userId: userId || null,
      action: 'EXPENSE_CATEGORY_CREATED',
      module: 'EXPENSES',
      referenceId: created.id,
      newValue: JSON.stringify({ name: created.name }),
    });

    return created;
  }

  public async updateCategory(
    companyId: string,
    id: string,
    dto: ExpenseCategoryUpdateDTO,
    userId?: string,
  ): Promise<ExpenseCategory> {
    const existing = await this.repo.findById(id);
    if (!existing || existing.companyId !== companyId) {
      throw new NotFoundError('Expense category not found.');
    }

    if (dto.name && dto.name.trim() !== existing.name) {
      const duplicate = await this.repo.findByName(companyId, dto.name.trim());
      if (duplicate && duplicate.id !== id) {
        throw new ConflictError(`Expense category "${dto.name}" already exists.`);
      }
    }

    const updated = await this.repo.update(id, dto);

    await this.auditService.log({
      companyId,
      userId: userId || null,
      action: 'EXPENSE_CATEGORY_UPDATED',
      module: 'EXPENSES',
      referenceId: id,
      oldValue: JSON.stringify({ name: existing.name, isActive: existing.isActive }),
      newValue: JSON.stringify({ name: updated.name, isActive: updated.isActive }),
    });

    return updated;
  }

  public async deleteCategory(companyId: string, id: string, userId?: string): Promise<boolean> {
    const existing = await this.repo.findById(id);
    if (!existing || existing.companyId !== companyId) {
      throw new NotFoundError('Expense category not found.');
    }

    const hasExpenses = await this.repo.hasExpenses(id);
    if (hasExpenses) {
      throw new BusinessRuleError(
        'Cannot delete an expense category that has historical expenses. Please deactivate it instead.',
      );
    }

    await this.repo.delete(id);

    await this.auditService.log({
      companyId,
      userId: userId || null,
      action: 'EXPENSE_CATEGORY_DELETED',
      module: 'EXPENSES',
      referenceId: id,
      oldValue: JSON.stringify({ name: existing.name }),
    });

    return true;
  }

  public async seedDefaultCategories(companyId: string, userId?: string): Promise<number> {
    let seeded = 0;
    for (const name of DEFAULT_EXPENSE_CATEGORIES) {
      const existing = await this.repo.findByName(companyId, name);
      if (!existing) {
        await this.repo.create(companyId, { name }, userId);
        seeded++;
      }
    }
    return seeded;
  }
}
