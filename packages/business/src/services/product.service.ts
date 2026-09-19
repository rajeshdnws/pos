import { PrismaClient } from '@prisma/client';
import {
  PaginatedResult,
  Product,
  ProductCreateDTO,
  ProductFilterDTO,
  ProductPriceHistory,
  ProductUpdateDTO,
} from '@rs-inventory/types';
import { BusinessRuleError, ValidationError } from '../errors/app.error.js';
import { CategoryRepository } from '../repositories/category.repository.js';
import { ProductRepository } from '../repositories/product.repository.js';
import { UnitRepository } from '../repositories/unit.repository.js';
import { BrandRepository } from '../repositories/brand.repository.js';
import { AuditService } from './audit.service.js';

export class ProductService {
  private repo: ProductRepository;
  private categoryRepo: CategoryRepository;
  private unitRepo: UnitRepository;
  private brandRepo: BrandRepository;
  private auditService: AuditService;

  constructor(prisma: PrismaClient) {
    this.repo = new ProductRepository(prisma);
    this.categoryRepo = new CategoryRepository(prisma);
    this.unitRepo = new UnitRepository(prisma);
    this.brandRepo = new BrandRepository(prisma);
    this.auditService = new AuditService(prisma);
  }

  public async getProductById(id: string): Promise<Product | null> {
    return this.repo.findById(id);
  }

  public async getProductBySku(companyId: string, sku: string): Promise<Product | null> {
    return this.repo.findBySku(companyId, sku);
  }

  public async getProductByBarcode(companyId: string, barcode: string): Promise<Product | null> {
    return this.repo.findByBarcode(companyId, barcode);
  }

  public async generateSku(companyId: string): Promise<string> {
    return this.repo.generateNextSku(companyId);
  }

  public async searchProducts(companyId: string, query: string, limit: number = 20): Promise<Product[]> {
    return this.repo.search(companyId, query, limit);
  }

  public async getProducts(
    companyId: string,
    filters: ProductFilterDTO = {},
  ): Promise<PaginatedResult<Product>> {
    return this.repo.findPaginated(companyId, filters);
  }

  public async getPriceHistory(productId: string): Promise<ProductPriceHistory[]> {
    return this.repo.getPriceHistory(productId);
  }

  public async createProduct(
    companyId: string,
    dto: ProductCreateDTO,
    userId?: string,
  ): Promise<Product> {
    // 1. Validations
    if (!dto.name || dto.name.trim().length === 0) {
      throw new ValidationError('Product name is required.');
    }

    if (!dto.categoryId) {
      throw new ValidationError('Product category is required.');
    }
    const category = await this.categoryRepo.findById(dto.categoryId);
    if (!category || category.companyId !== companyId) {
      throw new BusinessRuleError('Selected category is invalid or belongs to another company.');
    }

    if (!dto.unitId) {
      throw new ValidationError('Product measurement unit is required.');
    }
    const unit = await this.unitRepo.findById(dto.unitId);
    if (!unit || unit.companyId !== companyId) {
      throw new BusinessRuleError('Selected unit is invalid or belongs to another company.');
    }

    if (dto.brandId) {
      const brand = await this.brandRepo.findById(dto.brandId);
      if (!brand || brand.companyId !== companyId) {
        throw new BusinessRuleError('Selected brand is invalid or belongs to another company.');
      }
    }

    // SKU check
    if (dto.sku && dto.sku.trim()) {
      const existingSku = await this.repo.findBySku(companyId, dto.sku.trim());
      if (existingSku) {
        throw new BusinessRuleError(`Product with SKU "${dto.sku.trim()}" already exists.`);
      }
    }

    // Barcode check
    if (dto.barcode && dto.barcode.trim()) {
      const existingBarcode = await this.repo.findByBarcode(companyId, dto.barcode.trim());
      if (existingBarcode) {
        throw new BusinessRuleError(`Product with Barcode "${dto.barcode.trim()}" already exists.`);
      }
    }

    // Numeric validations
    const purchasePrice = Number(dto.purchasePrice) || 0;
    const sellingPrice = Number(dto.sellingPrice) || 0;
    const mrp = Number(dto.mrp) || 0;
    const taxRate = Number(dto.taxRate) || 0;
    const minimumStock = Number(dto.minimumStock) || 0;
    const openingStock = Number(dto.openingStock) || 0;
    const openingStockRate = Number(dto.openingStockRate) || 0;

    if (purchasePrice < 0) throw new ValidationError('Purchase price cannot be negative.');
    if (sellingPrice < 0) throw new ValidationError('Selling price cannot be negative.');
    if (mrp < 0) throw new ValidationError('MRP cannot be negative.');
    if (taxRate < 0) throw new ValidationError('Tax rate cannot be negative.');
    if (minimumStock < 0) throw new ValidationError('Minimum stock cannot be negative.');
    if (openingStock < 0) throw new ValidationError('Opening stock cannot be negative.');
    if (openingStockRate < 0) throw new ValidationError('Opening stock rate cannot be negative.');

    if (dto.maximumStock !== undefined && dto.maximumStock !== null) {
      const maxStock = Number(dto.maximumStock);
      if (maxStock < minimumStock) {
        throw new ValidationError('Maximum stock cannot be less than minimum stock.');
      }
    }

    // Decimal allowance check on unit
    if (!unit.allowDecimals) {
      if (openingStock % 1 !== 0) {
        throw new ValidationError(`Unit "${unit.name}" does not allow decimal quantities.`);
      }
      if (minimumStock % 1 !== 0) {
        throw new ValidationError(`Unit "${unit.name}" does not allow decimal quantities.`);
      }
    }

    // 2. Persist Product
    const created = await this.repo.create(companyId, dto, userId);

    await this.auditService.log({
      companyId,
      userId,
      action: 'PRODUCT_CREATED',
      module: 'PRODUCTS',
      referenceId: created.id,
      newValue: JSON.stringify({
        name: created.name,
        sku: created.sku,
        barcode: created.barcode,
        sellingPrice: created.sellingPrice,
        purchasePrice: created.purchasePrice,
        openingStock: created.openingStock,
      }),
    });

    return created;
  }

  public async updateProduct(
    id: string,
    dto: ProductUpdateDTO,
    userId?: string,
  ): Promise<Product> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new BusinessRuleError('Product not found.');
    }

    if (dto.name !== undefined && dto.name.trim().length === 0) {
      throw new ValidationError('Product name cannot be empty.');
    }

    if (dto.categoryId !== undefined && dto.categoryId) {
      const category = await this.categoryRepo.findById(dto.categoryId);
      if (!category || category.companyId !== existing.companyId) {
        throw new BusinessRuleError('Selected category is invalid.');
      }
    }

    let unit = existing.unit;
    if (dto.unitId !== undefined && dto.unitId) {
      const foundUnit = await this.unitRepo.findById(dto.unitId);
      if (!foundUnit || foundUnit.companyId !== existing.companyId) {
        throw new BusinessRuleError('Selected unit is invalid.');
      }
      unit = foundUnit;
    }

    if (dto.brandId !== undefined && dto.brandId) {
      const brand = await this.brandRepo.findById(dto.brandId);
      if (!brand || brand.companyId !== existing.companyId) {
        throw new BusinessRuleError('Selected brand is invalid.');
      }
    }

    // SKU duplicate check
    if (dto.sku !== undefined && dto.sku && dto.sku.trim()) {
      const cleanSku = dto.sku.trim();
      if (cleanSku !== existing.sku) {
        const duplicate = await this.repo.findBySku(existing.companyId, cleanSku);
        if (duplicate && duplicate.id !== id) {
          throw new BusinessRuleError(`Product with SKU "${cleanSku}" already exists.`);
        }
      }
    }

    // Barcode duplicate check
    if (dto.barcode !== undefined && dto.barcode && dto.barcode.trim()) {
      const cleanBarcode = dto.barcode.trim();
      if (cleanBarcode !== existing.barcode) {
        const duplicate = await this.repo.findByBarcode(existing.companyId, cleanBarcode);
        if (duplicate && duplicate.id !== id) {
          throw new BusinessRuleError(`Product with Barcode "${cleanBarcode}" already exists.`);
        }
      }
    }

    // Numeric checks
    if (dto.purchasePrice !== undefined && Number(dto.purchasePrice) < 0) {
      throw new ValidationError('Purchase price cannot be negative.');
    }
    if (dto.sellingPrice !== undefined && Number(dto.sellingPrice) < 0) {
      throw new ValidationError('Selling price cannot be negative.');
    }
    if (dto.mrp !== undefined && Number(dto.mrp) < 0) {
      throw new ValidationError('MRP cannot be negative.');
    }
    if (dto.taxRate !== undefined && Number(dto.taxRate) < 0) {
      throw new ValidationError('Tax rate cannot be negative.');
    }
    if (dto.minimumStock !== undefined && Number(dto.minimumStock) < 0) {
      throw new ValidationError('Minimum stock cannot be negative.');
    }

    const minStock = dto.minimumStock !== undefined ? Number(dto.minimumStock) : existing.minimumStock;
    if (dto.maximumStock !== undefined && dto.maximumStock !== null) {
      if (Number(dto.maximumStock) < minStock) {
        throw new ValidationError('Maximum stock cannot be less than minimum stock.');
      }
    }

    if (unit && !unit.allowDecimals && dto.minimumStock !== undefined) {
      if (Number(dto.minimumStock) % 1 !== 0) {
        throw new ValidationError(`Unit "${unit.name}" does not allow decimal quantities.`);
      }
    }

    const updated = await this.repo.update(id, dto, userId);

    await this.auditService.log({
      companyId: existing.companyId,
      userId,
      action: 'PRODUCT_UPDATED',
      module: 'PRODUCTS',
      referenceId: id,
      oldValue: JSON.stringify({
        name: existing.name,
        sellingPrice: existing.sellingPrice,
        purchasePrice: existing.purchasePrice,
        mrp: existing.mrp,
      }),
      newValue: JSON.stringify({
        name: updated.name,
        sellingPrice: updated.sellingPrice,
        purchasePrice: updated.purchasePrice,
        mrp: updated.mrp,
      }),
    });

    return updated;
  }

  public async toggleProductActive(id: string, userId?: string): Promise<Product> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new BusinessRuleError('Product not found.');
    }

    const updated = await this.repo.toggleActive(id);
    const action = updated.isActive ? 'PRODUCT_ACTIVATED' : 'PRODUCT_DEACTIVATED';

    await this.auditService.log({
      companyId: existing.companyId,
      userId,
      action,
      module: 'PRODUCTS',
      referenceId: id,
      newValue: JSON.stringify({ name: updated.name, sku: updated.sku, isActive: updated.isActive }),
    });

    return updated;
  }
}
