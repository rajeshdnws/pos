import { PrismaClient } from '@prisma/client';
import { Stocktake, StocktakeCreateDTO, StocktakeUpdateDTO } from '@rs-inventory/types';
import { BusinessRuleError, ValidationError } from '../errors/app.error.js';
import { LocationRepository } from '../repositories/location.repository.js';
import { StocktakeRepository } from '../repositories/stocktake.repository.js';
import { AuditService } from './audit.service.js';
import { StockService } from './stock.service.js';

export class StocktakeService {
  private repo: StocktakeRepository;
  private locationRepo: LocationRepository;
  private stockService: StockService;
  private auditService: AuditService;

  constructor(private readonly prisma: PrismaClient) {
    this.repo = new StocktakeRepository(prisma);
    this.locationRepo = new LocationRepository(prisma);
    this.stockService = new StockService(prisma);
    this.auditService = new AuditService(prisma);
  }

  public async getStocktakes(companyId: string, limit: number = 50): Promise<Stocktake[]> {
    return this.repo.findAll(companyId, limit);
  }

  public async getStocktake(id: string): Promise<Stocktake | null> {
    return this.repo.findById(id);
  }

  public async createStocktake(
    companyId: string,
    dto: StocktakeCreateDTO,
    userId?: string,
  ): Promise<Stocktake> {
    let locationId = dto.locationId;
    if (!locationId) {
      const defaultLoc = await this.locationRepo.getDefault(companyId);
      locationId = defaultLoc.id;
    }

    const location = await this.locationRepo.findById(locationId);
    if (!location || location.companyId !== companyId) {
      throw new BusinessRuleError('Valid inventory storage location is required.');
    }

    // Check if there is already an active/in-progress stocktake in this location
    const activeExisting = await this.prisma.stocktake.findFirst({
      where: {
        companyId,
        locationId,
        status: { in: ['DRAFT', 'IN_PROGRESS'] },
      },
    });

    if (activeExisting) {
      throw new BusinessRuleError(
        `There is already an active stocktake session (${activeExisting.stocktakeNumber}) in "${location.name}". Complete or cancel it first.`,
      );
    }

    // Fetch all active physical products
    const products = await this.prisma.product.findMany({
      where: { companyId, isActive: true, trackStock: true, productType: 'PHYSICAL' },
      include: {
        stockBalances: {
          where: { locationId },
        },
      },
      orderBy: { name: 'asc' },
    });

    const stocktakeNumber = await this.repo.generateStocktakeNumber(companyId);

    const itemsData = products.map((prod) => {
      const balance = prod.stockBalances[0];
      const systemQuantity = balance ? balance.quantity : 0;
      return {
        productId: prod.id,
        systemQuantity,
        countedQuantity: systemQuantity, // default to system quantity so user can adjust
        differenceQuantity: 0,
        notes: null,
      };
    });

    const stocktake = await this.repo.create(
      {
        companyId,
        stocktakeNumber,
        locationId,
        status: 'DRAFT',
        notes: dto.notes?.trim() || null,
        createdBy: userId || 'SYSTEM',
      },
      itemsData,
    );

    await this.auditService.log({
      companyId,
      userId,
      action: 'STOCKTAKE_CREATED',
      module: 'INVENTORY',
      referenceId: stocktake.id,
      newValue: JSON.stringify({ stocktakeNumber, itemsCount: itemsData.length }),
    });

    return stocktake;
  }

  public async updateStocktake(
    id: string,
    dto: StocktakeUpdateDTO,
    userId?: string,
  ): Promise<Stocktake> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new BusinessRuleError('Stocktake session not found.');
    }

    if (existing.status === 'COMPLETED' || existing.status === 'CANCELLED') {
      throw new BusinessRuleError(`Cannot update a ${existing.status.toLowerCase()} stocktake.`);
    }

    if (dto.notes !== undefined) {
      await this.repo.updateNotes(id, dto.notes);
    }

    if (dto.items && dto.items.length > 0) {
      for (const item of dto.items) {
        if (item.countedQuantity < 0) {
          throw new ValidationError('Counted quantity cannot be negative.');
        }
        await this.repo.updateItemCount(id, item.productId, item.countedQuantity, item.notes);
      }
    }

    await this.auditService.log({
      companyId: existing.companyId,
      userId,
      action: 'STOCKTAKE_UPDATED',
      module: 'INVENTORY',
      referenceId: id,
    });

    const updated = await this.repo.findById(id);
    return updated!;
  }

  public async startStocktake(id: string, userId?: string): Promise<Stocktake> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new BusinessRuleError('Stocktake session not found.');
    }

    if (existing.status !== 'DRAFT') {
      throw new BusinessRuleError('Only draft stocktake sessions can be started.');
    }

    const updated = await this.repo.updateStatus(id, 'IN_PROGRESS', {
      startedAt: new Date(),
    });

    await this.auditService.log({
      companyId: existing.companyId,
      userId,
      action: 'STOCKTAKE_STARTED',
      module: 'INVENTORY',
      referenceId: id,
    });

    return updated;
  }

  public async completeStocktake(id: string, userId?: string): Promise<Stocktake> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new BusinessRuleError('Stocktake session not found.');
    }

    if (existing.status === 'COMPLETED') {
      throw new BusinessRuleError('Stocktake session is already completed.');
    }
    if (existing.status === 'CANCELLED') {
      throw new BusinessRuleError('Cannot complete a cancelled stocktake session.');
    }

    return this.prisma.$transaction(async (tx) => {
      // For each item with non-zero difference, create signed stock movements
      if (existing.items && existing.items.length > 0) {
        for (const item of existing.items) {
          const counted = item.countedQuantity !== null && item.countedQuantity !== undefined ? item.countedQuantity : item.systemQuantity;
          const diff = Number((counted - item.systemQuantity).toFixed(4));

          if (diff !== 0) {
            await this.stockService.recordMovement({
              companyId: existing.companyId,
              productId: item.productId,
              locationId: existing.locationId,
              movementType: 'STOCKTAKE_CORRECTION',
              quantity: diff,
              referenceType: 'STOCKTAKE',
              referenceId: existing.id,
              referenceNumber: existing.stocktakeNumber,
              notes: `Stocktake count variance adjustment (${diff > 0 ? '+' : ''}${diff})`,
              userId,
              tx,
            });
          }
        }
      }

      const completed = await this.repo.updateStatus(
        id,
        'COMPLETED',
        {
          completedBy: userId || 'SYSTEM',
          completedAt: new Date(),
        },
        tx,
      );

      await this.auditService.log(
        {
          companyId: existing.companyId,
          userId,
          action: 'STOCKTAKE_COMPLETED',
          module: 'INVENTORY',
          referenceId: id,
          newValue: JSON.stringify({
            message: `Completed stocktake session ${existing.stocktakeNumber}. Corrections posted.`,
          }),
        },
        tx as any,
      );

      return completed;
    });
  }


  public async cancelStocktake(id: string, userId?: string): Promise<Stocktake> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new BusinessRuleError('Stocktake session not found.');
    }

    if (existing.status === 'COMPLETED') {
      throw new BusinessRuleError('Cannot cancel an already completed stocktake.');
    }

    const cancelled = await this.repo.updateStatus(id, 'CANCELLED');

    await this.auditService.log({
      companyId: existing.companyId,
      userId,
      action: 'STOCKTAKE_CANCELLED',
      module: 'INVENTORY',
      referenceId: id,
    });

    return cancelled;
  }
}
