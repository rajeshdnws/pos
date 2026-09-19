import { PrismaClient } from '@prisma/client';
import { Category, CategoryCreateDTO, CategoryUpdateDTO } from '@rs-inventory/types';
import { BusinessRuleError, ValidationError } from '../errors/app.error.js';
import { CategoryRepository } from '../repositories/category.repository.js';
import { AuditService } from './audit.service.js';

export class CategoryService {
  private repo: CategoryRepository;
  private auditService: AuditService;

  constructor(prisma: PrismaClient) {
    this.repo = new CategoryRepository(prisma);
    this.auditService = new AuditService(prisma);
  }

  public async getCategories(companyId: string, includeInactive: boolean = false): Promise<Category[]> {
    return this.repo.findAll(companyId, includeInactive);
  }

  public async getCategory(id: string): Promise<Category | null> {
    return this.repo.findById(id);
  }

  public async createCategory(
    companyId: string,
    dto: CategoryCreateDTO,
    userId?: string,
  ): Promise<Category> {
    if (!dto.name || dto.name.trim().length === 0) {
      throw new ValidationError('Category name is required.');
    }

    const cleanName = dto.name.trim();
    const existing = await this.repo.findByName(companyId, cleanName);
    if (existing) {
      throw new BusinessRuleError(`Category "${cleanName}" already exists.`);
    }

    const created = await this.repo.create(companyId, {
      ...dto,
      name: cleanName,
    });

    await this.auditService.log({
      companyId,
      userId,
      action: 'CATEGORY_CREATED',
      module: 'PRODUCTS',
      referenceId: created.id,
      newValue: JSON.stringify({ name: created.name, description: created.description }),
    });

    return created;
  }

  public async updateCategory(
    id: string,
    dto: CategoryUpdateDTO,
    userId?: string,
  ): Promise<Category> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new BusinessRuleError('Category not found.');
    }

    if (dto.name !== undefined) {
      const cleanName = dto.name.trim();
      if (cleanName.length === 0) {
        throw new ValidationError('Category name cannot be empty.');
      }
      if (cleanName.toLowerCase() !== existing.name.toLowerCase()) {
        const duplicate = await this.repo.findByName(existing.companyId, cleanName);
        if (duplicate && duplicate.id !== id) {
          throw new BusinessRuleError(`Category "${cleanName}" already exists.`);
        }
      }
    }

    const updated = await this.repo.update(id, dto);

    await this.auditService.log({
      companyId: existing.companyId,
      userId,
      action: 'CATEGORY_UPDATED',
      module: 'PRODUCTS',
      referenceId: id,
      oldValue: JSON.stringify({ name: existing.name, description: existing.description }),
      newValue: JSON.stringify({ name: updated.name, description: updated.description }),
    });

    return updated;
  }

  public async toggleCategoryActive(id: string, userId?: string): Promise<Category> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new BusinessRuleError('Category not found.');
    }

    const updated = await this.repo.toggleActive(id);
    const action = updated.isActive ? 'CATEGORY_ACTIVATED' : 'CATEGORY_DEACTIVATED';

    await this.auditService.log({
      companyId: existing.companyId,
      userId,
      action,
      module: 'PRODUCTS',
      referenceId: id,
      newValue: JSON.stringify({ name: updated.name, isActive: updated.isActive }),
    });

    return updated;
  }
}
