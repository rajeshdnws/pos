import { PrismaClient } from '@prisma/client';
import { Brand, BrandCreateDTO, BrandUpdateDTO } from '@rs-inventory/types';
import { BusinessRuleError, ValidationError } from '../errors/app.error.js';
import { BrandRepository } from '../repositories/brand.repository.js';
import { AuditService } from './audit.service.js';

export class BrandService {
  private repo: BrandRepository;
  private auditService: AuditService;

  constructor(prisma: PrismaClient) {
    this.repo = new BrandRepository(prisma);
    this.auditService = new AuditService(prisma);
  }

  public async getBrands(companyId: string, includeInactive: boolean = false): Promise<Brand[]> {
    return this.repo.findAll(companyId, includeInactive);
  }

  public async getBrand(id: string): Promise<Brand | null> {
    return this.repo.findById(id);
  }

  public async createBrand(
    companyId: string,
    dto: BrandCreateDTO,
    userId?: string,
  ): Promise<Brand> {
    if (!dto.name || dto.name.trim().length === 0) {
      throw new ValidationError('Brand name is required.');
    }

    const cleanName = dto.name.trim();
    const existing = await this.repo.findByName(companyId, cleanName);
    if (existing) {
      throw new BusinessRuleError(`Brand "${cleanName}" already exists.`);
    }

    const created = await this.repo.create(companyId, {
      ...dto,
      name: cleanName,
    });

    await this.auditService.log({
      companyId,
      userId,
      action: 'BRAND_CREATED',
      module: 'PRODUCTS',
      referenceId: created.id,
      newValue: JSON.stringify({ name: created.name, description: created.description }),
    });

    return created;
  }

  public async updateBrand(
    id: string,
    dto: BrandUpdateDTO,
    userId?: string,
  ): Promise<Brand> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new BusinessRuleError('Brand not found.');
    }

    if (dto.name !== undefined) {
      const cleanName = dto.name.trim();
      if (cleanName.length === 0) {
        throw new ValidationError('Brand name cannot be empty.');
      }
      if (cleanName.toLowerCase() !== existing.name.toLowerCase()) {
        const duplicate = await this.repo.findByName(existing.companyId, cleanName);
        if (duplicate && duplicate.id !== id) {
          throw new BusinessRuleError(`Brand "${cleanName}" already exists.`);
        }
      }
    }

    const updated = await this.repo.update(id, dto);

    await this.auditService.log({
      companyId: existing.companyId,
      userId,
      action: 'BRAND_UPDATED',
      module: 'PRODUCTS',
      referenceId: id,
      oldValue: JSON.stringify({ name: existing.name, description: existing.description }),
      newValue: JSON.stringify({ name: updated.name, description: updated.description }),
    });

    return updated;
  }

  public async toggleBrandActive(id: string, userId?: string): Promise<Brand> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new BusinessRuleError('Brand not found.');
    }

    const updated = await this.repo.toggleActive(id);
    const action = updated.isActive ? 'BRAND_ACTIVATED' : 'BRAND_DEACTIVATED';

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
