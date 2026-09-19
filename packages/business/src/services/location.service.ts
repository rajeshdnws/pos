import { PrismaClient } from '@prisma/client';
import { InventoryLocation, LocationCreateDTO, LocationUpdateDTO } from '@rs-inventory/types';
import { BusinessRuleError, ValidationError } from '../errors/app.error.js';
import { LocationRepository } from '../repositories/location.repository.js';
import { AuditService } from './audit.service.js';

export class LocationService {
  private repo: LocationRepository;
  private auditService: AuditService;

  constructor(prisma: PrismaClient) {
    this.repo = new LocationRepository(prisma);
    this.auditService = new AuditService(prisma);
  }

  public async getLocations(companyId: string, includeInactive: boolean = false): Promise<InventoryLocation[]> {
    return this.repo.findAll(companyId, includeInactive);
  }

  public async getLocation(id: string): Promise<InventoryLocation | null> {
    return this.repo.findById(id);
  }

  public async getDefaultLocation(companyId: string): Promise<InventoryLocation> {
    return this.repo.getDefault(companyId);
  }

  public async createLocation(
    companyId: string,
    dto: LocationCreateDTO,
    userId?: string,
  ): Promise<InventoryLocation> {
    if (!dto.name || dto.name.trim().length === 0) {
      throw new ValidationError('Location name is required.');
    }
    if (!dto.code || dto.code.trim().length === 0) {
      throw new ValidationError('Location code is required.');
    }

    const cleanName = dto.name.trim();
    const cleanCode = dto.code.trim().toUpperCase();

    const existingName = await this.repo.findByName(companyId, cleanName);
    if (existingName) {
      throw new BusinessRuleError(`Location with name "${cleanName}" already exists.`);
    }

    const existingCode = await this.repo.findByCode(companyId, cleanCode);
    if (existingCode) {
      throw new BusinessRuleError(`Location with code "${cleanCode}" already exists.`);
    }

    const created = await this.repo.create(companyId, {
      ...dto,
      name: cleanName,
      code: cleanCode,
    });

    await this.auditService.log({
      companyId,
      userId,
      action: 'LOCATION_CREATED',
      module: 'INVENTORY',
      referenceId: created.id,
      newValue: JSON.stringify({ name: created.name, code: created.code, type: created.locationType }),
    });

    return created;
  }

  public async updateLocation(
    id: string,
    dto: LocationUpdateDTO,
    userId?: string,
  ): Promise<InventoryLocation> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new BusinessRuleError('Location not found.');
    }

    if (dto.name !== undefined) {
      const cleanName = dto.name.trim();
      if (cleanName.length === 0) {
        throw new ValidationError('Location name cannot be empty.');
      }
      if (cleanName.toLowerCase() !== existing.name.toLowerCase()) {
        const dupName = await this.repo.findByName(existing.companyId, cleanName);
        if (dupName && dupName.id !== id) {
          throw new BusinessRuleError(`Location with name "${cleanName}" already exists.`);
        }
      }
    }

    if (dto.code !== undefined) {
      const cleanCode = dto.code.trim().toUpperCase();
      if (cleanCode.length === 0) {
        throw new ValidationError('Location code cannot be empty.');
      }
      if (cleanCode !== existing.code) {
        const dupCode = await this.repo.findByCode(existing.companyId, cleanCode);
        if (dupCode && dupCode.id !== id) {
          throw new BusinessRuleError(`Location with code "${cleanCode}" already exists.`);
        }
      }
    }

    const updated = await this.repo.update(id, dto);

    await this.auditService.log({
      companyId: existing.companyId,
      userId,
      action: 'LOCATION_UPDATED',
      module: 'INVENTORY',
      referenceId: id,
      oldValue: JSON.stringify({ name: existing.name, code: existing.code, isDefault: existing.isDefault }),
      newValue: JSON.stringify({ name: updated.name, code: updated.code, isDefault: updated.isDefault }),
    });

    return updated;
  }

  public async toggleLocationActive(id: string, userId?: string): Promise<InventoryLocation> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new BusinessRuleError('Location not found.');
    }

    if (existing.isDefault && existing.isActive) {
      throw new BusinessRuleError('Cannot deactivate the default storage location.');
    }

    const updated = await this.repo.toggleActive(id);

    await this.auditService.log({
      companyId: existing.companyId,
      userId,
      action: updated.isActive ? 'LOCATION_ACTIVATED' : 'LOCATION_DEACTIVATED',
      module: 'INVENTORY',
      referenceId: id,
    });

    return updated;
  }
}
