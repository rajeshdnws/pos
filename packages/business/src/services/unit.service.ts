import { PrismaClient } from '@prisma/client';
import { Unit, UnitCreateDTO, UnitUpdateDTO } from '@rs-inventory/types';
import { BusinessRuleError, ValidationError } from '../errors/app.error.js';
import { UnitRepository } from '../repositories/unit.repository.js';
import { AuditService } from './audit.service.js';

export class UnitService {
  private repo: UnitRepository;
  private auditService: AuditService;

  constructor(prisma: PrismaClient) {
    this.repo = new UnitRepository(prisma);
    this.auditService = new AuditService(prisma);
  }

  public async getUnits(companyId: string, includeInactive: boolean = false): Promise<Unit[]> {
    return this.repo.findAll(companyId, includeInactive);
  }

  public async getUnit(id: string): Promise<Unit | null> {
    return this.repo.findById(id);
  }

  public async createUnit(
    companyId: string,
    dto: UnitCreateDTO,
    userId?: string,
  ): Promise<Unit> {
    if (!dto.name || dto.name.trim().length === 0) {
      throw new ValidationError('Unit name is required.');
    }
    if (!dto.shortCode || dto.shortCode.trim().length === 0) {
      throw new ValidationError('Unit short code / symbol is required.');
    }

    const cleanCode = dto.shortCode.trim().toUpperCase();
    const cleanName = dto.name.trim();

    const existing = await this.repo.findByShortCode(companyId, cleanCode);
    if (existing) {
      throw new BusinessRuleError(`Unit with short code "${cleanCode}" already exists.`);
    }

    const created = await this.repo.create(companyId, {
      name: cleanName,
      shortCode: cleanCode,
      allowDecimals: Boolean(dto.allowDecimals),
      isActive: dto.isActive !== undefined ? dto.isActive : true,
    });

    await this.auditService.log({
      companyId,
      userId,
      action: 'UNIT_CREATED',
      module: 'PRODUCTS',
      referenceId: created.id,
      newValue: JSON.stringify({ name: created.name, shortCode: created.shortCode, allowDecimals: created.allowDecimals }),
    });

    return created;
  }

  public async updateUnit(
    id: string,
    dto: UnitUpdateDTO,
    userId?: string,
  ): Promise<Unit> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new BusinessRuleError('Unit not found.');
    }

    if (dto.name !== undefined && dto.name.trim().length === 0) {
      throw new ValidationError('Unit name cannot be empty.');
    }

    if (dto.shortCode !== undefined) {
      const cleanCode = dto.shortCode.trim().toUpperCase();
      if (cleanCode.length === 0) {
        throw new ValidationError('Unit short code cannot be empty.');
      }
      if (cleanCode !== existing.shortCode) {
        const duplicate = await this.repo.findByShortCode(existing.companyId, cleanCode);
        if (duplicate && duplicate.id !== id) {
          throw new BusinessRuleError(`Unit with short code "${cleanCode}" already exists.`);
        }
      }
    }

    const updated = await this.repo.update(id, dto);

    await this.auditService.log({
      companyId: existing.companyId,
      userId,
      action: 'UNIT_UPDATED',
      module: 'PRODUCTS',
      referenceId: id,
      oldValue: JSON.stringify({ name: existing.name, shortCode: existing.shortCode, allowDecimals: existing.allowDecimals }),
      newValue: JSON.stringify({ name: updated.name, shortCode: updated.shortCode, allowDecimals: updated.allowDecimals }),
    });

    return updated;
  }

  public async toggleUnitActive(id: string, userId?: string): Promise<Unit> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new BusinessRuleError('Unit not found.');
    }

    const updated = await this.repo.toggleActive(id);
    const action = updated.isActive ? 'UNIT_ACTIVATED' : 'UNIT_DEACTIVATED';

    await this.auditService.log({
      companyId: existing.companyId,
      userId,
      action,
      module: 'PRODUCTS',
      referenceId: id,
      newValue: JSON.stringify({ name: updated.name, shortCode: updated.shortCode, isActive: updated.isActive }),
    });

    return updated;
  }

  public async seedDefaultUnits(companyId: string, userId?: string): Promise<Unit[]> {
    const units = await this.repo.seedDefaultUnits(companyId);
    await this.auditService.log({
      companyId,
      userId,
      action: 'UNITS_SEEDED',
      module: 'PRODUCTS',
      newValue: JSON.stringify({ count: units.length }),
    });
    return units;
  }
}
