import { PrismaClient } from '@prisma/client';
import { StockAdjustment, StockAdjustmentCreateDTO } from '@rs-inventory/types';
import { BusinessRuleError, ValidationError } from '../errors/app.error.js';
import { LocationRepository } from '../repositories/location.repository.js';
import { StockAdjustmentRepository } from '../repositories/stock-adjustment.repository.js';
import { AuditService } from './audit.service.js';
import { StockService } from './stock.service.js';

export class StockAdjustmentService {
  private repo: StockAdjustmentRepository;
  private locationRepo: LocationRepository;
  private stockService: StockService;
  private auditService: AuditService;

  constructor(private readonly prisma: PrismaClient) {
    this.repo = new StockAdjustmentRepository(prisma);
    this.locationRepo = new LocationRepository(prisma);
    this.stockService = new StockService(prisma);
    this.auditService = new AuditService(prisma);
  }

  public async getAdjustments(companyId: string, limit: number = 50): Promise<StockAdjustment[]> {
    return this.repo.findAll(companyId, limit);
  }

  public async getAdjustment(id: string): Promise<StockAdjustment | null> {
    return this.repo.findById(id);
  }

  public async createAdjustment(
    companyId: string,
    dto: StockAdjustmentCreateDTO,
    userId?: string,
  ): Promise<StockAdjustment> {
    if (!dto.reason || dto.reason.trim().length === 0) {
      throw new ValidationError('Adjustment reason is mandatory.');
    }
    if (!dto.items || dto.items.length === 0) {
      throw new ValidationError('At least one item is required for stock adjustment.');
    }

    // Resolve location
    let locationId = dto.locationId;
    if (!locationId) {
      const defaultLoc = await this.locationRepo.getDefault(companyId);
      locationId = defaultLoc.id;
    }

    const location = await this.locationRepo.findById(locationId);
    if (!location || location.companyId !== companyId) {
      throw new BusinessRuleError('Valid inventory storage location is required.');
    }

    return this.prisma.$transaction(async (tx) => {
      const adjustmentNumber = await this.repo.generateAdjustmentNumber(companyId);

      const itemsData = [];

      for (const item of dto.items) {
        if (!item.productId) {
          throw new ValidationError('Product ID is required for each adjustment item.');
        }
        if (!item.quantity || item.quantity <= 0) {
          throw new ValidationError('Adjustment quantity must be greater than 0.');
        }

        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: { unit: true },
        });

        if (!product || product.companyId !== companyId) {
          throw new BusinessRuleError(`Product with ID ${item.productId} not found.`);
        }

        if (product.unit && !product.unit.allowDecimals && !Number.isInteger(item.quantity)) {
          throw new ValidationError(
            `Unit "${product.unit.shortCode}" for product "${product.name}" does not allow decimals.`,
          );
        }

        // Get system quantity
        const existingBalance = await tx.stockBalance.findUnique({
          where: {
            companyId_productId_locationId: {
              companyId,
              productId: item.productId,
              locationId,
            },
          },
        });

        const systemQuantity = existingBalance ? existingBalance.quantity : 0;
        const diffQty = dto.type === 'INCREASE' ? item.quantity : -item.quantity;
        const countedQuantity = Number((systemQuantity + diffQty).toFixed(4));

        itemsData.push({
          productId: item.productId,
          systemQuantity,
          countedQuantity,
          differenceQuantity: diffQty,
          unitCost: item.unitCost !== undefined ? item.unitCost : product.purchasePrice,
          notes: item.reason || null,
        });
      }

      // Create StockAdjustment header and items
      const adjustment = await this.repo.create(
        {
          companyId,
          adjustmentNumber,
          locationId,
          adjustmentType: dto.type,
          reason: dto.reason.trim(),
          status: 'POSTED',
          notes: dto.notes?.trim() || null,
          createdBy: userId || 'SYSTEM',
          approvedBy: userId || 'SYSTEM',
        },
        itemsData,
        tx,
      );

      // Record Signed Stock Movements for each item
      for (const item of itemsData) {
        await this.stockService.recordMovement({
          companyId,
          productId: item.productId,
          locationId,
          movementType: dto.type === 'INCREASE' ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
          quantity: item.differenceQuantity,
          unitCost: item.unitCost,
          referenceType: 'ADJUSTMENT',
          referenceId: adjustment.id,
          referenceNumber: adjustment.adjustmentNumber,
          notes: dto.reason.trim(),
          userId,
          tx,
        });
      }

      await this.auditService.log(
        {
          companyId,
          userId,
          action: 'STOCK_ADJUSTMENT_CREATED',
          module: 'INVENTORY',
          referenceId: adjustment.id,
          newValue: JSON.stringify({
            adjustmentNumber: adjustment.adjustmentNumber,
            type: dto.type,
            reason: dto.reason,
            itemsCount: itemsData.length,
          }),
        },
        tx as any,
      );

      return adjustment;
    });
  }
}
