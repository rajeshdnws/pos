import { PrismaClient } from '@prisma/client';
import { StockTransfer, StockTransferCreateDTO } from '@rs-inventory/types';
import { BusinessRuleError, ValidationError } from '../errors/app.error.js';
import { LocationRepository } from '../repositories/location.repository.js';
import { StockTransferRepository } from '../repositories/stock-transfer.repository.js';
import { AuditService } from './audit.service.js';
import { StockService } from './stock.service.js';

export class StockTransferService {
  private repo: StockTransferRepository;
  private locationRepo: LocationRepository;
  private stockService: StockService;
  private auditService: AuditService;

  constructor(private readonly prisma: PrismaClient) {
    this.repo = new StockTransferRepository(prisma);
    this.locationRepo = new LocationRepository(prisma);
    this.stockService = new StockService(prisma);
    this.auditService = new AuditService(prisma);
  }

  public async getTransfers(companyId: string, limit: number = 50): Promise<StockTransfer[]> {
    return this.repo.findAll(companyId, limit);
  }

  public async getTransfer(id: string): Promise<StockTransfer | null> {
    return this.repo.findById(id);
  }

  public async createTransfer(
    companyId: string,
    dto: StockTransferCreateDTO,
    userId?: string,
  ): Promise<StockTransfer> {
    if (!dto.sourceLocationId) {
      throw new ValidationError('Source location is required.');
    }
    if (!dto.destinationLocationId) {
      throw new ValidationError('Destination location is required.');
    }
    if (dto.sourceLocationId === dto.destinationLocationId) {
      throw new BusinessRuleError('Source and destination locations cannot be the same.');
    }
    if (!dto.items || dto.items.length === 0) {
      throw new ValidationError('At least one item is required for stock transfer.');
    }

    const sourceLoc = await this.locationRepo.findById(dto.sourceLocationId);
    if (!sourceLoc || sourceLoc.companyId !== companyId) {
      throw new BusinessRuleError('Valid source location is required.');
    }

    const destLoc = await this.locationRepo.findById(dto.destinationLocationId);
    if (!destLoc || destLoc.companyId !== companyId) {
      throw new BusinessRuleError('Valid destination location is required.');
    }

    return this.prisma.$transaction(async (tx) => {
      const transferNumber = await this.repo.generateTransferNumber(companyId);

      const itemsData = [];

      for (const item of dto.items) {
        if (!item.productId) {
          throw new ValidationError('Product ID is required for each transfer item.');
        }
        if (!item.quantity || item.quantity <= 0) {
          throw new ValidationError('Transfer quantity must be greater than 0.');
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

        const unitCost = item.unitCost !== undefined ? item.unitCost : product.purchasePrice;

        itemsData.push({
          productId: item.productId,
          quantity: item.quantity,
          unitCost,
        });
      }

      // Create StockTransfer header and items
      const transfer = await this.repo.create(
        {
          companyId,
          transferNumber,
          sourceLocationId: dto.sourceLocationId,
          destinationLocationId: dto.destinationLocationId,
          status: 'COMPLETED',
          notes: dto.notes?.trim() || null,
          createdBy: userId || 'SYSTEM',
          completedBy: userId || 'SYSTEM',
          completedAt: new Date(),
        },
        itemsData,
        tx,
      );

      // Record Transfer Out and Transfer In movements atomically
      for (const item of itemsData) {
        // 1. Out from Source
        await this.stockService.recordMovement({
          companyId,
          productId: item.productId,
          locationId: dto.sourceLocationId,
          movementType: 'TRANSFER_OUT',
          quantity: -item.quantity,
          unitCost: item.unitCost,
          referenceType: 'TRANSFER',
          referenceId: transfer.id,
          referenceNumber: transfer.transferNumber,
          notes: `Transfer out to ${destLoc.name}`,
          userId,
          tx,
        });

        // 2. In to Destination
        await this.stockService.recordMovement({
          companyId,
          productId: item.productId,
          locationId: dto.destinationLocationId,
          movementType: 'TRANSFER_IN',
          quantity: item.quantity,
          unitCost: item.unitCost,
          referenceType: 'TRANSFER',
          referenceId: transfer.id,
          referenceNumber: transfer.transferNumber,
          notes: `Transfer in from ${sourceLoc.name}`,
          userId,
          tx,
        });
      }

      await this.auditService.log(
        {
          companyId,
          userId,
          action: 'STOCK_TRANSFER_COMPLETED',
          module: 'INVENTORY',
          referenceId: transfer.id,
          newValue: JSON.stringify({
            transferNumber: transfer.transferNumber,
            source: sourceLoc.name,
            destination: destLoc.name,
            itemsCount: itemsData.length,
          }),
        },
        tx as any,
      );

      return transfer;
    });
  }

  public async cancelTransfer(id: string, userId?: string): Promise<StockTransfer> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new BusinessRuleError('Transfer record not found.');
    }

    if (existing.status === 'CANCELLED') {
      throw new BusinessRuleError('Transfer is already cancelled.');
    }

    // Invert the movements
    return this.prisma.$transaction(async (tx) => {
      if (existing.items && existing.items.length > 0) {
        for (const item of existing.items) {
          // Reverse: Out from Destination
          await this.stockService.recordMovement({
            companyId: existing.companyId,
            productId: item.productId,
            locationId: existing.destinationLocationId,
            movementType: 'TRANSFER_OUT',
            quantity: -item.quantity,
            unitCost: item.unitCost,
            referenceType: 'TRANSFER_CANCEL',
            referenceId: existing.id,
            referenceNumber: existing.transferNumber,
            notes: `Cancelled transfer reverse from ${existing.destinationLocation?.name}`,
            userId,
            tx,
          });

          // Reverse: In back to Source
          await this.stockService.recordMovement({
            companyId: existing.companyId,
            productId: item.productId,
            locationId: existing.sourceLocationId,
            movementType: 'TRANSFER_IN',
            quantity: item.quantity,
            unitCost: item.unitCost,
            referenceType: 'TRANSFER_CANCEL',
            referenceId: existing.id,
            referenceNumber: existing.transferNumber,
            notes: `Cancelled transfer return to ${existing.sourceLocation?.name}`,
            userId,
            tx,
          });
        }
      }

      const updated = await this.repo.updateStatus(id, 'CANCELLED', tx);

      await this.auditService.log(
        {
          companyId: existing.companyId,
          userId,
          action: 'STOCK_TRANSFER_CANCELLED',
          module: 'INVENTORY',
          referenceId: id,
          newValue: JSON.stringify({
            message: `Reversed transfer ${existing.transferNumber} between locations.`,
            transferNumber: existing.transferNumber,
          }),
        },
        tx as any,
      );

      return updated;
    });
  }
}
