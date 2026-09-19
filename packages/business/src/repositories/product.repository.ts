import { PrismaClient } from '@prisma/client';
import {
  PaginatedResult,
  Product,
  ProductCreateDTO,
  ProductFilterDTO,
  ProductPriceHistory,
  ProductUpdateDTO,
} from '@rs-inventory/types';

export class ProductRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findById(id: string): Promise<Product | null> {
    const record = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        brand: true,
        unit: true,
        priceHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    return record as unknown as Product | null;
  }

  public async findBySku(companyId: string, sku: string): Promise<Product | null> {
    if (!sku || !sku.trim()) return null;
    const record = await this.prisma.product.findUnique({
      where: {
        companyId_sku: {
          companyId,
          sku: sku.trim(),
        },
      },
      include: {
        category: true,
        brand: true,
        unit: true,
      },
    });
    return record as unknown as Product | null;
  }

  public async findByBarcode(companyId: string, barcode: string): Promise<Product | null> {
    if (!barcode || !barcode.trim()) return null;
    const record = await this.prisma.product.findUnique({
      where: {
        companyId_barcode: {
          companyId,
          barcode: barcode.trim(),
        },
      },
      include: {
        category: true,
        brand: true,
        unit: true,
      },
    });
    return record as unknown as Product | null;
  }

  public async generateNextSku(companyId: string): Promise<string> {
    const count = await this.prisma.product.count({
      where: { companyId },
    });
    let seq = count + 1;
    let candidate = `PROD-${String(seq).padStart(6, '0')}`;
    while (await this.findBySku(companyId, candidate)) {
      seq++;
      candidate = `PROD-${String(seq).padStart(6, '0')}`;
    }
    return candidate;
  }

  public async search(companyId: string, query: string, limit: number = 20): Promise<Product[]> {
    const q = query.trim();
    if (!q) {
      return this.findPaginated(companyId, { pageSize: limit }).then((r) => r.items);
    }

    const records = await this.prisma.product.findMany({
      where: {
        companyId,
        isActive: true,
        OR: [
          { name: { contains: q } },
          { shortName: { contains: q } },
          { sku: { contains: q } },
          { barcode: { contains: q } },
        ],
      },
      include: {
        category: true,
        brand: true,
        unit: true,
      },
      take: limit,
      orderBy: { name: 'asc' },
    });

    return records as unknown as Product[];
  }

  public async findPaginated(
    companyId: string,
    filters: ProductFilterDTO = {},
  ): Promise<PaginatedResult<Product>> {
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize || 25));
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {
      companyId,
    };

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    } else if (filters.status === 'active') {
      where.isActive = true;
    } else if (filters.status === 'inactive') {
      where.isActive = false;
    }

    if (filters.lowStock) {
      where.trackStock = true;
      const lowStockRows = await this.prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM products 
        WHERE company_id = ${companyId} 
          AND track_stock = 1 
          AND current_stock <= minimum_stock
      `;
      const ids = lowStockRows.map((r) => r.id);
      where.id = { in: ids };
    }

    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }
    if (filters.brandId) {
      where.brandId = filters.brandId;
    }
    if (filters.unitId) {
      where.unitId = filters.unitId;
    }
    if (filters.productType) {
      where.productType = filters.productType;
    }
    if (filters.taxRate !== undefined) {
      where.taxRate = Number(filters.taxRate);
    }

    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { name: { contains: q } },
        { shortName: { contains: q } },
        { sku: { contains: q } },
        { barcode: { contains: q } },
      ];
    }

    // Determine sorting
    const sortBy = filters.sortBy || 'name';
    const sortOrder = filters.sortOrder || 'asc';
    const orderBy: Record<string, string> = { [sortBy]: sortOrder };

    const [total, records] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: {
          category: true,
          brand: true,
          unit: true,
        },
        skip,
        take: pageSize,
        orderBy,
      }),
    ]);

    const totalPages = Math.ceil(total / pageSize) || 1;

    return {
      items: records as unknown as Product[],
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  public async create(
    companyId: string,
    data: ProductCreateDTO,
    userId?: string,
  ): Promise<Product> {
    const sku = data.sku ? data.sku.trim() : await this.generateNextSku(companyId);
    const barcode = data.barcode?.trim() || null;
    const purchasePrice = Number(data.purchasePrice) || 0;
    const sellingPrice = Number(data.sellingPrice) || 0;
    const mrp = Number(data.mrp) || 0;
    const taxRate = Number(data.taxRate) || 0;
    const openingStock = Number(data.openingStock) || 0;
    const openingStockRate = Number(data.openingStockRate) || (purchasePrice > 0 ? purchasePrice : 0);

    return await this.prisma.$transaction(async (tx) => {
      // 1. Create Product record
      const created = await tx.product.create({
        data: {
          companyId,
          categoryId: data.categoryId || null,
          brandId: data.brandId || null,
          unitId: data.unitId || null,
          name: data.name.trim(),
          shortName: data.shortName?.trim() || null,
          description: data.description?.trim() || null,
          sku,
          barcode,
          hsnCode: data.hsnCode?.trim() || null,
          productType: data.productType || 'PHYSICAL',
          purchasePrice,
          sellingPrice,
          mrp,
          taxRate,
          minimumStock: Number(data.minimumStock) || 0,
          maximumStock: data.maximumStock !== undefined && data.maximumStock !== null ? Number(data.maximumStock) : null,
          openingStock,
          openingStockRate,
          currentStock: openingStock, // Initial stock is opening stock until Step 4
          trackStock: data.trackStock !== undefined ? data.trackStock : true,
          isActive: data.isActive !== undefined ? data.isActive : true,
        },
        include: {
          category: true,
          brand: true,
          unit: true,
        },
      });

      // 2. Create Initial Price History Record
      await tx.productPriceHistory.create({
        data: {
          productId: created.id,
          oldPurchasePrice: null,
          newPurchasePrice: purchasePrice,
          oldSellingPrice: null,
          newSellingPrice: sellingPrice,
          oldMrp: null,
          newMrp: mrp,
          oldTaxRate: null,
          newTaxRate: taxRate,
          changedBy: userId || 'SYSTEM',
        },
      });

      // 3. Record Opening Stock Movement & Stock Balance if > 0
      if (openingStock > 0) {
        let defaultLoc = await tx.inventoryLocation.findFirst({
          where: { companyId, isDefault: true },
        });
        if (!defaultLoc) {
          defaultLoc = await tx.inventoryLocation.findFirst({
            where: { companyId },
            orderBy: { createdAt: 'asc' },
          });
        }
        if (!defaultLoc) {
          defaultLoc = await tx.inventoryLocation.create({
            data: {
              companyId,
              name: 'Main Store',
              code: 'MAIN',
              description: 'Primary store and main stock holding location',
              locationType: 'STORE',
              isDefault: true,
              isActive: true,
            },
          });
        }

        await tx.stockMovement.create({
          data: {
            companyId,
            productId: created.id,
            locationId: defaultLoc.id,
            movementType: 'OPENING_STOCK',
            quantity: openingStock,
            unitCost: openingStockRate,
            referenceType: 'OPENING',
            referenceId: created.id,
            notes: 'Initial opening stock entry',
            createdBy: userId || 'SYSTEM',
          },
        });

        await tx.stockBalance.create({
          data: {
            companyId,
            productId: created.id,
            locationId: defaultLoc.id,
            quantity: openingStock,
          },
        });
      }

      return created as unknown as Product;
    });
  }


  public async update(
    id: string,
    data: ProductUpdateDTO,
    userId?: string,
  ): Promise<Product> {
    const existing = await this.prisma.product.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new Error(`Product with ID ${id} not found.`);
    }

    const newPurchasePrice = data.purchasePrice !== undefined ? Number(data.purchasePrice) : existing.purchasePrice;
    const newSellingPrice = data.sellingPrice !== undefined ? Number(data.sellingPrice) : existing.sellingPrice;
    const newMrp = data.mrp !== undefined ? Number(data.mrp) : existing.mrp;
    const newTaxRate = data.taxRate !== undefined ? Number(data.taxRate) : existing.taxRate;

    const priceChanged =
      newPurchasePrice !== existing.purchasePrice ||
      newSellingPrice !== existing.sellingPrice ||
      newMrp !== existing.mrp ||
      newTaxRate !== existing.taxRate;

    return await this.prisma.$transaction(async (tx) => {
      // 1. Update Product
      const updated = await tx.product.update({
        where: { id },
        data: {
          ...(data.name !== undefined ? { name: data.name.trim() } : {}),
          ...(data.shortName !== undefined ? { shortName: data.shortName?.trim() || null } : {}),
          ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
          ...(data.sku !== undefined ? { sku: data.sku?.trim() || null } : {}),
          ...(data.barcode !== undefined ? { barcode: data.barcode?.trim() || null } : {}),
          ...(data.hsnCode !== undefined ? { hsnCode: data.hsnCode?.trim() || null } : {}),
          ...(data.categoryId !== undefined ? { categoryId: data.categoryId || null } : {}),
          ...(data.brandId !== undefined ? { brandId: data.brandId || null } : {}),
          ...(data.unitId !== undefined ? { unitId: data.unitId || null } : {}),
          ...(data.productType !== undefined ? { productType: data.productType } : {}),
          ...(data.purchasePrice !== undefined ? { purchasePrice: newPurchasePrice } : {}),
          ...(data.sellingPrice !== undefined ? { sellingPrice: newSellingPrice } : {}),
          ...(data.mrp !== undefined ? { mrp: newMrp } : {}),
          ...(data.taxRate !== undefined ? { taxRate: newTaxRate } : {}),
          ...(data.minimumStock !== undefined ? { minimumStock: Number(data.minimumStock) } : {}),
          ...(data.maximumStock !== undefined ? { maximumStock: data.maximumStock !== null ? Number(data.maximumStock) : null } : {}),
          ...(data.trackStock !== undefined ? { trackStock: data.trackStock } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        },
        include: {
          category: true,
          brand: true,
          unit: true,
        },
      });

      // 2. Record Price History if price changed
      if (priceChanged) {
        await tx.productPriceHistory.create({
          data: {
            productId: id,
            oldPurchasePrice: existing.purchasePrice,
            newPurchasePrice,
            oldSellingPrice: existing.sellingPrice,
            newSellingPrice,
            oldMrp: existing.mrp,
            newMrp,
            oldTaxRate: existing.taxRate,
            newTaxRate,
            changedBy: userId || 'SYSTEM',
          },
        });
      }

      return updated as unknown as Product;
    });
  }

  public async toggleActive(id: string): Promise<Product> {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new Error(`Product with ID ${id} not found.`);
    }
    const updated = await this.prisma.product.update({
      where: { id },
      data: { isActive: !existing.isActive },
      include: {
        category: true,
        brand: true,
        unit: true,
      },
    });
    return updated as unknown as Product;
  }

  public async getPriceHistory(productId: string): Promise<ProductPriceHistory[]> {
    const records = await this.prisma.productPriceHistory.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
    });
    return records as unknown as ProductPriceHistory[];
  }
}
