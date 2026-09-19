import { PrismaClient } from '@prisma/client';
import {
  DemoDataClearResult,
  DemoDataInstallResult,
  DemoDataStatus,
} from '@rs-inventory/types';
import { BusinessRuleError } from '../errors/app.error.js';
import { AuditService } from './audit.service.js';

export class DemoDataService {
  private auditService: AuditService;

  constructor(private readonly prisma: PrismaClient) {
    this.auditService = new AuditService(prisma);
  }

  public async getDemoDataStatus(companyId: string): Promise<DemoDataStatus> {
    const [
      demoProductsCount,
      demoCategoriesCount,
      demoBrandsCount,
      demoLocationsCount,
      demoMovementsCount,
      demoSuppliersCount,
      demoPurchasesCount,
      demoPaymentsCount,
      demoReturnsCount,
    ] = await Promise.all([
      this.prisma.product.count({
        where: {
          companyId,
          OR: [
            { sku: { startsWith: 'DEMO-' } },
            { description: { contains: '[DEMO_DATA]' } },
          ],
        },
      }),
      this.prisma.category.count({
        where: {
          companyId,
          description: { contains: '[DEMO_DATA]' },
        },
      }),
      this.prisma.brand.count({
        where: {
          companyId,
          description: { contains: '[DEMO_DATA]' },
        },
      }),
      this.prisma.inventoryLocation.count({
        where: {
          companyId,
          isDefault: false,
          OR: [
            { code: { startsWith: 'DEMO-' } },
            { description: { contains: '[DEMO_DATA]' } },
          ],
        },
      }),
      this.prisma.stockMovement.count({
        where: {
          companyId,
          notes: { contains: '[DEMO_DATA]' },
        },
      }),
      this.prisma.supplier.count({
        where: {
          companyId,
          OR: [
            { supplierCode: { startsWith: 'SUP-DEMO-' } },
            { notes: { contains: '[DEMO_DATA]' } },
          ],
        },
      }),
      this.prisma.purchase.count({
        where: {
          companyId,
          OR: [
            { purchaseNumber: { startsWith: 'PUR-DEMO-' } },
            { notes: { contains: '[DEMO_DATA]' } },
          ],
        },
      }),
      this.prisma.paymentMade.count({
        where: {
          companyId,
          OR: [
            { paymentNumber: { startsWith: 'PAY-DEMO-' } },
            { notes: { contains: '[DEMO_DATA]' } },
          ],
        },
      }),
      this.prisma.purchaseReturn.count({
        where: {
          companyId,
          OR: [
            { returnNumber: { startsWith: 'PR-DEMO-' } },
            { notes: { contains: '[DEMO_DATA]' } },
          ],
        },
      }),
    ]);

    const latestDemoProduct = await this.prisma.product.findFirst({
      where: {
        companyId,
        sku: { startsWith: 'DEMO-' },
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    return {
      hasDemoData:
        demoProductsCount > 0 ||
        demoSuppliersCount > 0 ||
        demoPurchasesCount > 0,
      demoProductsCount,
      demoCategoriesCount,
      demoBrandsCount,
      demoLocationsCount,
      demoMovementsCount,
      demoSuppliersCount,
      demoPurchasesCount,
      demoPaymentsCount,
      demoReturnsCount,
      installedAt: latestDemoProduct ? latestDemoProduct.createdAt.toISOString() : null,
    };
  }

  public async installDemoData(companyId: string, userId?: string): Promise<DemoDataInstallResult> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new BusinessRuleError('Company not found.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Get or Create Default Location
      let defaultLocation = await tx.inventoryLocation.findFirst({
        where: { companyId, isDefault: true },
      });

      if (!defaultLocation) {
        defaultLocation = await tx.inventoryLocation.create({
          data: {
            companyId,
            name: 'Main Store',
            code: 'MAIN',
            locationType: 'STORE',
            isDefault: true,
            isActive: true,
          },
        });
      }

      // 2. Ensure standard Units exist
      const standardUnits = [
        { name: 'Pieces', shortCode: 'PCS', allowDecimals: false },
        { name: 'Kilograms', shortCode: 'KG', allowDecimals: true },
        { name: 'Liters', shortCode: 'LTR', allowDecimals: true },
        { name: 'Box', shortCode: 'BOX', allowDecimals: false },
        { name: 'Pack', shortCode: 'PKT', allowDecimals: false },
        { name: 'Dozen', shortCode: 'DOZ', allowDecimals: false },
        { name: 'Meters', shortCode: 'MTR', allowDecimals: true },
      ];

      const unitMap: Record<string, string> = {};
      for (const u of standardUnits) {
        let existing = await tx.unit.findUnique({
          where: { companyId_shortCode: { companyId, shortCode: u.shortCode } },
        });
        if (!existing) {
          existing = await tx.unit.create({
            data: {
              companyId,
              name: u.name,
              shortCode: u.shortCode,
              allowDecimals: u.allowDecimals,
              isActive: true,
            },
          });
        }
        unitMap[u.shortCode] = existing.id;
      }

      // 3. Create Demo Categories
      const demoCategoriesData = [
        { name: 'Beverages & Drinks', description: 'Packaged teas, coffees, juices, energy drinks [DEMO_DATA]' },
        { name: 'Snacks & Packaged Foods', description: 'Biscuits, noodles, chocolates, confectionery [DEMO_DATA]' },
        { name: 'Personal Care & Hygiene', description: 'Soaps, handwash, oral care, shampoos [DEMO_DATA]' },
        { name: 'Electronics & Accessories', description: 'Headphones, mice, cables, chargers, bulbs [DEMO_DATA]' },
        { name: 'Stationery & School Supplies', description: 'Notebooks, pens, desk stationery, papers [DEMO_DATA]' },
        { name: 'Dairy & Grocery Essentials', description: 'Butter, cooking oil, flour, milk powders [DEMO_DATA]' },
      ];

      const categoryMap: Record<string, string> = {};
      let categoriesCreated = 0;
      for (const cat of demoCategoriesData) {
        let existing = await tx.category.findFirst({
          where: { companyId, name: cat.name },
        });
        if (!existing) {
          existing = await tx.category.create({
            data: {
              companyId,
              name: cat.name,
              description: cat.description,
              isActive: true,
            },
          });
          categoriesCreated++;
        }
        categoryMap[cat.name] = existing.id;
      }

      // 4. Create Demo Brands
      const demoBrandsData = [
        { name: 'Tata Consumer', description: 'Tata Tea, Tata Salt, Himalayan [DEMO_DATA]' },
        { name: 'Amul India', description: 'The Taste of India [DEMO_DATA]' },
        { name: 'Nestlé India', description: 'Maggi, Nescafe, KitKat [DEMO_DATA]' },
        { name: 'boAt Lifestyle', description: 'Audio & Wearables [DEMO_DATA]' },
        { name: 'Logitech', description: 'Computer peripherals & accessories [DEMO_DATA]' },
        { name: 'Classmate', description: 'ITC Classmate Stationery [DEMO_DATA]' },
        { name: 'Britannia', description: 'Biscuits, Breads & Dairy [DEMO_DATA]' },
        { name: 'Colgate-Palmolive', description: 'Oral care and hygiene [DEMO_DATA]' },
      ];

      const brandMap: Record<string, string> = {};
      let brandsCreated = 0;
      for (const br of demoBrandsData) {
        let existing = await tx.brand.findFirst({
          where: { companyId, name: br.name },
        });
        if (!existing) {
          existing = await tx.brand.create({
            data: {
              companyId,
              name: br.name,
              description: br.description,
              isActive: true,
            },
          });
          brandsCreated++;
        }
        brandMap[br.name] = existing.id;
      }

      // 5. Create Demo Storage Locations
      const demoLocationsData = [
        { name: 'Central Warehouse', code: 'DEMO-WH-A', locationType: 'WAREHOUSE', description: 'Floor 1, Sector B [DEMO_DATA]' },
        { name: 'Front Display Rack 1', code: 'DEMO-RACK-1', locationType: 'RACK', description: 'Aisle 3, Shelf 2 [DEMO_DATA]' },
      ];

      const locationMap: Record<string, string> = {
        MAIN: defaultLocation.id,
      };
      let locationsCreated = 0;
      for (const loc of demoLocationsData) {
        let existing = await tx.inventoryLocation.findFirst({
          where: { companyId, code: loc.code },
        });
        if (!existing) {
          existing = await tx.inventoryLocation.create({
            data: {
              companyId,
              name: loc.name,
              code: loc.code,
              locationType: loc.locationType,
              description: loc.description,
              isDefault: false,
              isActive: true,
            },
          });
          locationsCreated++;
        }
        locationMap[loc.code] = existing.id;
      }

      // 6. Create 16 Realistic Demo Products with barcodes & stock
      const demoProductsData = [
        {
          name: 'Tata Tea Gold 500g',
          shortName: 'Tata Tea Gold',
          sku: 'DEMO-BEV-001',
          barcode: '8901030382910',
          category: 'Beverages & Drinks',
          brand: 'Tata Consumer',
          unit: 'PKT',
          hsnCode: '0902',
          taxRate: 5,
          purchasePrice: 240,
          sellingPrice: 285,
          mrp: 300,
          minimumStock: 10,
          maximumStock: 100,
          openingStock: 40,
          openingStockRate: 240,
        },
        {
          name: 'Red Bull Energy Drink 250ml Can',
          shortName: 'Red Bull 250ml',
          sku: 'DEMO-BEV-002',
          barcode: '9002490100070',
          category: 'Beverages & Drinks',
          brand: 'Tata Consumer',
          unit: 'PCS',
          hsnCode: '2202',
          taxRate: 18,
          purchasePrice: 95,
          sellingPrice: 120,
          mrp: 125,
          minimumStock: 12,
          maximumStock: 80,
          openingStock: 30,
          openingStockRate: 95,
        },
        {
          name: 'Nestle Maggi 2-Minute Masala Noodles 280g',
          shortName: 'Maggi 280g',
          sku: 'DEMO-SNK-001',
          barcode: '8901058852310',
          category: 'Snacks & Packaged Foods',
          brand: 'Nestlé India',
          unit: 'PKT',
          hsnCode: '1902',
          taxRate: 12,
          purchasePrice: 42,
          sellingPrice: 52,
          mrp: 56,
          minimumStock: 20,
          maximumStock: 150,
          openingStock: 65,
          openingStockRate: 42,
        },
        {
          name: 'Britannia Good Day Butter Cookies 200g',
          shortName: 'Good Day 200g',
          sku: 'DEMO-SNK-002',
          barcode: '8901063141018',
          category: 'Snacks & Packaged Foods',
          brand: 'Britannia',
          unit: 'PKT',
          hsnCode: '1905',
          taxRate: 18,
          purchasePrice: 38,
          sellingPrice: 45,
          mrp: 50,
          minimumStock: 15,
          maximumStock: 120,
          openingStock: 50,
          openingStockRate: 38,
        },
        {
          name: 'Amul Salted Butter 500g',
          shortName: 'Amul Butter 500g',
          sku: 'DEMO-DAI-001',
          barcode: '8901262010014',
          category: 'Dairy & Grocery Essentials',
          brand: 'Amul India',
          unit: 'PKT',
          hsnCode: '0405',
          taxRate: 12,
          purchasePrice: 235,
          sellingPrice: 275,
          mrp: 285,
          minimumStock: 8,
          maximumStock: 60,
          openingStock: 25,
          openingStockRate: 235,
        },
        {
          name: 'Amul Taaza Homogenised Toned Milk 1L',
          shortName: 'Amul Taaza 1L',
          sku: 'DEMO-DAI-002',
          barcode: '8901262015026',
          category: 'Dairy & Grocery Essentials',
          brand: 'Amul India',
          unit: 'PKT',
          hsnCode: '0401',
          taxRate: 5,
          purchasePrice: 62,
          sellingPrice: 72,
          mrp: 75,
          minimumStock: 10,
          maximumStock: 80,
          openingStock: 35,
          openingStockRate: 62,
        },
        {
          name: 'Colgate Total Whole Mouth Health Toothpaste 150g',
          shortName: 'Colgate Total 150g',
          sku: 'DEMO-PER-001',
          barcode: '8901314010204',
          category: 'Personal Care & Hygiene',
          brand: 'Colgate-Palmolive',
          unit: 'PCS',
          hsnCode: '3306',
          taxRate: 18,
          purchasePrice: 110,
          sellingPrice: 145,
          mrp: 155,
          minimumStock: 10,
          maximumStock: 75,
          openingStock: 30,
          openingStockRate: 110,
        },
        {
          name: 'Dettol Original Germ Protection Liquid Handwash 750ml Refill',
          shortName: 'Dettol Handwash 750ml',
          sku: 'DEMO-PER-002',
          barcode: '8901396112001',
          category: 'Personal Care & Hygiene',
          brand: 'Colgate-Palmolive',
          unit: 'PCS',
          hsnCode: '3402',
          taxRate: 18,
          purchasePrice: 125,
          sellingPrice: 159,
          mrp: 175,
          minimumStock: 6,
          maximumStock: 50,
          openingStock: 20,
          openingStockRate: 125,
        },
        {
          name: 'boAt Rockerz 450 Bluetooth Wireless On-Ear Headphone (Luscious Black)',
          shortName: 'boAt Rockerz 450',
          sku: 'DEMO-ELE-001',
          barcode: '8904325601245',
          category: 'Electronics & Accessories',
          brand: 'boAt Lifestyle',
          unit: 'PCS',
          hsnCode: '8518',
          taxRate: 18,
          purchasePrice: 950,
          sellingPrice: 1399,
          mrp: 1499,
          minimumStock: 4,
          maximumStock: 30,
          openingStock: 12,
          openingStockRate: 950,
        },
        {
          name: 'Logitech M235 Wireless Optical Mouse (Grey/Black)',
          shortName: 'Logitech M235',
          sku: 'DEMO-ELE-002',
          barcode: '8906001051234',
          category: 'Electronics & Accessories',
          brand: 'Logitech',
          unit: 'PCS',
          hsnCode: '8471',
          taxRate: 18,
          purchasePrice: 620,
          sellingPrice: 849,
          mrp: 995,
          minimumStock: 5,
          maximumStock: 40,
          openingStock: 18,
          openingStockRate: 620,
        },
        {
          name: 'Syska 9W B22 LED Cool Day Light Bulb',
          shortName: 'Syska 9W LED',
          sku: 'DEMO-ELE-003',
          barcode: '8906044771021',
          category: 'Electronics & Accessories',
          brand: 'boAt Lifestyle',
          unit: 'PCS',
          hsnCode: '8539',
          taxRate: 12,
          purchasePrice: 75,
          sellingPrice: 110,
          mrp: 140,
          minimumStock: 10,
          maximumStock: 100,
          openingStock: 45,
          openingStockRate: 75,
        },
        {
          name: 'Classmate Pulse 6-Subject Spiral Notebook 300 Pgs',
          shortName: 'Classmate 6-Subject',
          sku: 'DEMO-STA-001',
          barcode: '8902519001023',
          category: 'Stationery & School Supplies',
          brand: 'Classmate',
          unit: 'PCS',
          hsnCode: '4820',
          taxRate: 12,
          purchasePrice: 130,
          sellingPrice: 175,
          mrp: 190,
          minimumStock: 8,
          maximumStock: 60,
          openingStock: 25,
          openingStockRate: 130,
        },
        {
          name: 'Classmate Long Exercise Notebook Ruled 240 Pgs (Pack of 6)',
          shortName: 'Classmate Pack of 6',
          sku: 'DEMO-STA-002',
          barcode: '8902519001085',
          category: 'Stationery & School Supplies',
          brand: 'Classmate',
          unit: 'PKT',
          hsnCode: '4820',
          taxRate: 12,
          purchasePrice: 280,
          sellingPrice: 360,
          mrp: 400,
          minimumStock: 5,
          maximumStock: 40,
          openingStock: 15,
          openingStockRate: 280,
        },
        {
          name: 'Cadbury Dairy Milk Silk Chocolate 150g',
          shortName: 'Silk 150g',
          sku: 'DEMO-SNK-003',
          barcode: '8901233024801',
          category: 'Snacks & Packaged Foods',
          brand: 'Nestlé India',
          unit: 'PCS',
          hsnCode: '1806',
          taxRate: 18,
          purchasePrice: 135,
          sellingPrice: 165,
          mrp: 175,
          minimumStock: 10,
          maximumStock: 70,
          openingStock: 28,
          openingStockRate: 135,
        },
        {
          name: 'Tata Sampann Unpolished Toor Dal 1kg',
          shortName: 'Tata Toor Dal 1kg',
          sku: 'DEMO-DAI-003',
          barcode: '8901030612000',
          category: 'Dairy & Grocery Essentials',
          brand: 'Tata Consumer',
          unit: 'PKT',
          hsnCode: '0713',
          taxRate: 5,
          purchasePrice: 145,
          sellingPrice: 175,
          mrp: 190,
          minimumStock: 10,
          maximumStock: 80,
          openingStock: 32,
          openingStockRate: 145,
        },
        {
          name: 'SanDisk Ultra Dual 64GB USB 3.0 Type-C Flash Drive',
          shortName: 'SanDisk 64GB Type-C',
          sku: 'DEMO-ELE-004',
          barcode: '6196591321010',
          category: 'Electronics & Accessories',
          brand: 'Logitech',
          unit: 'PCS',
          hsnCode: '8523',
          taxRate: 18,
          purchasePrice: 580,
          sellingPrice: 799,
          mrp: 950,
          minimumStock: 4,
          maximumStock: 30,
          openingStock: 10,
          openingStockRate: 580,
        },
      ];

      let productsCreated = 0;
      let movementsCreated = 0;
      const createdProducts: Array<{ id: string; name: string; sku: string; cost: number; taxRate: number; unitCode: string }> = [];

      for (const p of demoProductsData) {
        let existing = await tx.product.findFirst({
          where: { companyId, sku: p.sku },
        });

        if (!existing) {
          const categoryId = categoryMap[p.category];
          const brandId = brandMap[p.brand];
          const unitId = unitMap[p.unit] || unitMap['PCS']!;

          existing = await tx.product.create({
            data: {
              companyId,
              name: p.name,
              shortName: p.shortName,
              sku: p.sku,
              barcode: p.barcode,
              categoryId,
              brandId,
              unitId,
              hsnCode: p.hsnCode,
              taxRate: p.taxRate,
              purchasePrice: p.purchasePrice,
              sellingPrice: p.sellingPrice,
              mrp: p.mrp,
              minimumStock: p.minimumStock,
              maximumStock: p.maximumStock,
              openingStock: p.openingStock,
              openingStockRate: p.openingStockRate,
              currentStock: p.openingStock,
              trackStock: true,
              isActive: true,
              description: `Realistic Indian retail demo product [DEMO_DATA]`,
            },
          });
          productsCreated++;

          // Record Opening Stock Movement
          if (p.openingStock > 0) {
            await tx.stockMovement.create({
              data: {
                companyId,
                productId: existing.id,
                locationId: defaultLocation.id,
                movementType: 'OPENING_STOCK',
                quantity: p.openingStock,
                unitCost: p.openingStockRate,
                referenceType: 'OPENING_STOCK',
                referenceId: existing.id,
                referenceNumber: 'OPN-DEMO',
                notes: `Initial opening balance [DEMO_DATA]`,
                createdBy: userId || 'SYSTEM',
              },
            });
            movementsCreated++;

            // Upsert Stock Balance Projection
            await tx.stockBalance.upsert({
              where: {
                companyId_productId_locationId: {
                  companyId,
                  productId: existing.id,
                  locationId: defaultLocation.id,
                },
              },
              create: {
                companyId,
                productId: existing.id,
                locationId: defaultLocation.id,
                quantity: p.openingStock,
              },
              update: {
                quantity: { increment: p.openingStock },
              },
            });
          }
        }

        createdProducts.push({
          id: existing.id,
          name: existing.name,
          sku: existing.sku || p.sku,
          cost: existing.purchasePrice,
          taxRate: existing.taxRate,
          unitCode: p.unit,
        });
      }

      // 7. Create Sample Stock Adjustments
      let adjustmentsCreated = 0;
      if (createdProducts.length >= 2) {
        const prod1 = createdProducts[0]!; // Tata Tea
        const prod2 = createdProducts[1]!; // Red Bull

        // Increase adjustment (Surplus found)
        const adjIn = await tx.stockAdjustment.create({
          data: {
            companyId,
            adjustmentNumber: `ADJ-DEMO01`,
            locationId: defaultLocation.id,
            adjustmentType: 'INCREASE',
            reason: 'Found surplus inventory during weekly spot check [DEMO_DATA]',
            status: 'POSTED',
            notes: 'Demo increase adjustment [DEMO_DATA]',
            createdBy: userId || 'SYSTEM',
            approvedBy: userId || 'SYSTEM',
            items: {
              create: [
                {
                  productId: prod1.id,
                  systemQuantity: 40,
                  countedQuantity: 45,
                  differenceQuantity: 5,
                  unitCost: prod1.cost,
                  notes: 'Extra box in storage',
                },
              ],
            },
          },
        });
        adjustmentsCreated++;

        await tx.stockMovement.create({
          data: {
            companyId,
            productId: prod1.id,
            locationId: defaultLocation.id,
            movementType: 'ADJUSTMENT_IN',
            quantity: 5,
            unitCost: prod1.cost,
            referenceType: 'ADJUSTMENT',
            referenceId: adjIn.id,
            referenceNumber: adjIn.adjustmentNumber,
            notes: 'Found surplus inventory during weekly spot check [DEMO_DATA]',
            createdBy: userId || 'SYSTEM',
          },
        });
        movementsCreated++;

        await tx.stockBalance.update({
          where: {
            companyId_productId_locationId: {
              companyId,
              productId: prod1.id,
              locationId: defaultLocation.id,
            },
          },
          data: { quantity: { increment: 5 } },
        });

        await tx.product.update({
          where: { id: prod1.id },
          data: { currentStock: { increment: 5 } },
        });

        // Decrease adjustment (Damaged stock)
        const adjOut = await tx.stockAdjustment.create({
          data: {
            companyId,
            adjustmentNumber: `ADJ-DEMO02`,
            locationId: defaultLocation.id,
            adjustmentType: 'DECREASE',
            reason: 'Damaged can during unloading [DEMO_DATA]',
            status: 'POSTED',
            notes: 'Demo decrease adjustment [DEMO_DATA]',
            createdBy: userId || 'SYSTEM',
            approvedBy: userId || 'SYSTEM',
            items: {
              create: [
                {
                  productId: prod2.id,
                  systemQuantity: 30,
                  countedQuantity: 28,
                  differenceQuantity: -2,
                  unitCost: prod2.cost,
                  notes: 'Leaking cans written off',
                },
              ],
            },
          },
        });
        adjustmentsCreated++;

        await tx.stockMovement.create({
          data: {
            companyId,
            productId: prod2.id,
            locationId: defaultLocation.id,
            movementType: 'ADJUSTMENT_OUT',
            quantity: -2,
            unitCost: prod2.cost,
            referenceType: 'ADJUSTMENT',
            referenceId: adjOut.id,
            referenceNumber: adjOut.adjustmentNumber,
            notes: 'Damaged can during unloading [DEMO_DATA]',
            createdBy: userId || 'SYSTEM',
          },
        });
        movementsCreated++;

        await tx.stockBalance.update({
          where: {
            companyId_productId_locationId: {
              companyId,
              productId: prod2.id,
              locationId: defaultLocation.id,
            },
          },
          data: { quantity: { decrement: 2 } },
        });

        await tx.product.update({
          where: { id: prod2.id },
          data: { currentStock: { decrement: 2 } },
        });
      }

      // 8. Create Sample Stock Transfer
      let transfersCreated = 0;
      const warehouseLocId = locationMap['DEMO-WH-A'];
      if (createdProducts.length >= 3 && warehouseLocId) {
        const prod3 = createdProducts[2]!; // Maggi noodles

        const transfer = await tx.stockTransfer.create({
          data: {
            companyId,
            transferNumber: `TRF-DEMO01`,
            sourceLocationId: defaultLocation.id,
            destinationLocationId: warehouseLocId,
            status: 'COMPLETED',
            notes: 'Stock replenishment to Central Warehouse [DEMO_DATA]',
            completedAt: new Date(),
            createdBy: userId || 'SYSTEM',
            completedBy: userId || 'SYSTEM',
            items: {
              create: [
                {
                  productId: prod3.id,
                  quantity: 15,
                  unitCost: prod3.cost,
                },
              ],
            },
          },
        });
        transfersCreated++;

        // Movement Out from Main Store
        await tx.stockMovement.create({
          data: {
            companyId,
            productId: prod3.id,
            locationId: defaultLocation.id,
            movementType: 'TRANSFER_OUT',
            quantity: -15,
            unitCost: prod3.cost,
            referenceType: 'TRANSFER',
            referenceId: transfer.id,
            referenceNumber: transfer.transferNumber,
            notes: 'Transfer out to Central Warehouse [DEMO_DATA]',
            createdBy: userId || 'SYSTEM',
          },
        });
        movementsCreated++;

        await tx.stockBalance.update({
          where: {
            companyId_productId_locationId: {
              companyId,
              productId: prod3.id,
              locationId: defaultLocation.id,
            },
          },
          data: { quantity: { decrement: 15 } },
        });

        // Movement In to Central Warehouse
        await tx.stockMovement.create({
          data: {
            companyId,
            productId: prod3.id,
            locationId: warehouseLocId,
            movementType: 'TRANSFER_IN',
            quantity: 15,
            unitCost: prod3.cost,
            referenceType: 'TRANSFER',
            referenceId: transfer.id,
            referenceNumber: transfer.transferNumber,
            notes: 'Transfer in from Main Store [DEMO_DATA]',
            createdBy: userId || 'SYSTEM',
          },
        });
        movementsCreated++;

        await tx.stockBalance.upsert({
          where: {
            companyId_productId_locationId: {
              companyId,
              productId: prod3.id,
              locationId: warehouseLocId,
            },
          },
          create: {
            companyId,
            productId: prod3.id,
            locationId: warehouseLocId,
            quantity: 15,
          },
          update: {
            quantity: { increment: 15 },
          },
        });
      }

      // 9. Create Sample Stocktake
      let stocktakesCreated = 0;
      if (createdProducts.length >= 4) {
        const prod4 = createdProducts[3]!; // Britannia cookies

        const stocktake = await tx.stocktake.create({
          data: {
            companyId,
            stocktakeNumber: `STK-DEMO01`,
            locationId: defaultLocation.id,
            status: 'COMPLETED',
            notes: 'Quarterly sample audit session [DEMO_DATA]',
            startedAt: new Date(Date.now() - 3600000),
            completedAt: new Date(),
            createdBy: userId || 'SYSTEM',
            completedBy: userId || 'SYSTEM',
            items: {
              create: [
                {
                  productId: prod4.id,
                  systemQuantity: 50,
                  countedQuantity: 48,
                  differenceQuantity: -2,
                  notes: 'Found 48 packets during physical count [DEMO_DATA]',
                },
              ],
            },
          },
        });
        stocktakesCreated++;

        // Variance correction movement
        await tx.stockMovement.create({
          data: {
            companyId,
            productId: prod4.id,
            locationId: defaultLocation.id,
            movementType: 'STOCKTAKE_CORRECTION',
            quantity: -2,
            unitCost: prod4.cost,
            referenceType: 'STOCKTAKE',
            referenceId: stocktake.id,
            referenceNumber: stocktake.stocktakeNumber,
            notes: 'Stocktake variance adjustment [DEMO_DATA]',
            createdBy: userId || 'SYSTEM',
          },
        });
        movementsCreated++;

        await tx.stockBalance.update({
          where: {
            companyId_productId_locationId: {
              companyId,
              productId: prod4.id,
              locationId: defaultLocation.id,
            },
          },
          data: { quantity: { decrement: 2 } },
        });

        await tx.product.update({
          where: { id: prod4.id },
          data: { currentStock: { decrement: 2 } },
        });
      }

      // 10. Step 5: Create Demo Suppliers
      let suppliersCreated = 0;
      let purchasesCreated = 0;
      let paymentsCreated = 0;
      let returnsCreated = 0;

      // Supplier 1: National FMCG Distributors
      let sup1 = await tx.supplier.findFirst({
        where: { companyId, supplierCode: 'SUP-DEMO-01' },
      });
      if (!sup1) {
        sup1 = await tx.supplier.create({
          data: {
            companyId,
            supplierCode: 'SUP-DEMO-01',
            name: 'National FMCG Distributors',
            contactPerson: 'Rajesh Sharma',
            phone: '9876543210',
            email: 'sales@nationalfmcg.example.com',
            addressLine1: 'Plot 42, Transport Nagar',
            city: 'Mumbai',
            state: 'Maharashtra',
            pinCode: '400001',
            country: 'India',
            gstin: '27AABCN1234F1Z5',
            pan: 'AABCN1234F',
            registrationType: 'REGULAR',
            openingBalance: 15000,
            openingBalanceType: 'PAYABLE',
            openingBalanceDate: new Date(Date.now() - 30 * 86400000),
            creditLimit: 100000,
            creditPeriodDays: 30,
            currentBalance: 15000,
            isActive: true,
            notes: 'Authorized FMCG & food distributor [DEMO_DATA]',
            createdBy: userId || 'SYSTEM',
          },
        });
        suppliersCreated++;

        await tx.supplierLedger.create({
          data: {
            companyId,
            supplierId: sup1.id,
            entryDate: new Date(Date.now() - 30 * 86400000),
            transactionType: 'OPENING_BALANCE',
            referenceType: 'OPENING',
            creditAmount: 15000,
            runningBalance: 15000,
            description: 'Opening Balance [DEMO_DATA]',
            createdBy: userId || 'SYSTEM',
          },
        });
      }

      // Supplier 2: Apex Electronics Wholesale
      let sup2 = await tx.supplier.findFirst({
        where: { companyId, supplierCode: 'SUP-DEMO-02' },
      });
      if (!sup2) {
        sup2 = await tx.supplier.create({
          data: {
            companyId,
            supplierCode: 'SUP-DEMO-02',
            name: 'Apex Electronics Wholesale',
            contactPerson: 'Vikram Mehta',
            phone: '9811223344',
            email: 'orders@apexelectronics.example.com',
            addressLine1: 'Shop 14, Nehru Place Electronic Complex',
            city: 'New Delhi',
            state: 'Delhi',
            pinCode: '110019',
            country: 'India',
            gstin: '07AABCA5678G1Z2',
            pan: 'AABCA5678G',
            registrationType: 'REGULAR',
            openingBalance: 0,
            openingBalanceType: 'PAYABLE',
            creditLimit: 200000,
            creditPeriodDays: 15,
            currentBalance: 0,
            isActive: true,
            notes: 'Peripherals and consumer electronics wholesale vendor [DEMO_DATA]',
            createdBy: userId || 'SYSTEM',
          },
        });
        suppliersCreated++;
      }

      // Supplier 3: Himalayan Agro & Dairy Co.
      let sup3 = await tx.supplier.findFirst({
        where: { companyId, supplierCode: 'SUP-DEMO-03' },
      });
      if (!sup3) {
        sup3 = await tx.supplier.create({
          data: {
            companyId,
            supplierCode: 'SUP-DEMO-03',
            name: 'Himalayan Agro & Dairy Co.',
            contactPerson: 'Sunil Verma',
            phone: '9412345678',
            email: 'supply@himalayanagro.example.com',
            addressLine1: 'NH-58, Industrial Area',
            city: 'Dehradun',
            state: 'Uttarakhand',
            pinCode: '248001',
            country: 'India',
            gstin: '05AAACH9988D1Z9',
            pan: 'AAACH9988D',
            registrationType: 'COMPOSITION',
            openingBalance: 5000,
            openingBalanceType: 'PAYABLE',
            openingBalanceDate: new Date(Date.now() - 15 * 86400000),
            creditLimit: 50000,
            creditPeriodDays: 7,
            currentBalance: 5000,
            isActive: true,
            notes: 'Fresh dairy and packaged agro goods supplier [DEMO_DATA]',
            createdBy: userId || 'SYSTEM',
          },
        });
        suppliersCreated++;

        await tx.supplierLedger.create({
          data: {
            companyId,
            supplierId: sup3.id,
            entryDate: new Date(Date.now() - 15 * 86400000),
            transactionType: 'OPENING_BALANCE',
            referenceType: 'OPENING',
            creditAmount: 5000,
            runningBalance: 5000,
            description: 'Opening Balance [DEMO_DATA]',
            createdBy: userId || 'SYSTEM',
          },
        });
      }

      // 11. Create Demo Purchases
      if (createdProducts.length >= 5 && sup1 && sup2 && sup3) {
        const prodTea = createdProducts[0]!; // Tata Tea (240 cost, 5% tax)
        const prodRedBull = createdProducts[1]!; // Red Bull (95 cost, 18% tax)
        const prodMaggi = createdProducts[2]!; // Maggi (42 cost, 12% tax)
        const prodCookies = createdProducts[3]!; // Britannia Cookies (38 cost, 18% tax)
        const prodBoat = createdProducts[8] || createdProducts[0]!; // boAt Earphones (950 cost, 18% tax)

        // Purchase 1: PUR-DEMO-001 (Posted, Unpaid) with SUP-DEMO-01
        let pur1 = await tx.purchase.findFirst({
          where: { companyId, purchaseNumber: 'PUR-DEMO-001' },
        });
        if (!pur1) {
          const teaQty = 20;
          const teaRate = prodTea.cost;
          const teaTaxable = teaQty * teaRate; // 4800
          const teaTax = teaTaxable * 0.05; // 240
          const teaCgst = teaTax / 2; // 120
          const teaSgst = teaTax / 2; // 120
          const teaTotal = teaTaxable + teaTax; // 5040

          const boatQty = 5;
          const boatRate = prodBoat.cost;
          const boatTaxable = boatQty * boatRate; // 4750
          const boatTax = boatTaxable * 0.18; // 855
          const boatCgst = boatTax / 2; // 427.5
          const boatSgst = boatTax / 2; // 427.5
          const boatTotal = boatTaxable + boatTax; // 5605

          const pur1Subtotal = teaTaxable + boatTaxable;
          const pur1Cgst = teaCgst + boatCgst;
          const pur1Sgst = teaSgst + boatSgst;
          const pur1GrandTotal = teaTotal + boatTotal; // 10645

          pur1 = await tx.purchase.create({
            data: {
              companyId,
              supplierId: sup1.id,
              purchaseNumber: 'PUR-DEMO-001',
              supplierInvoiceNumber: 'INV-NFMCG-8812',
              purchaseDate: new Date(Date.now() - 5 * 86400000),
              dueDate: new Date(Date.now() + 25 * 86400000),
              locationId: defaultLocation.id,
              status: 'POSTED',
              subtotal: pur1Subtotal,
              taxableAmount: pur1Subtotal,
              cgstAmount: pur1Cgst,
              sgstAmount: pur1Sgst,
              grandTotal: pur1GrandTotal,
              amountPaid: 0,
              amountReturned: 0,
              paymentStatus: 'UNPAID',
              notes: 'Quarterly stock replenishment order [DEMO_DATA]',
              createdBy: userId || 'SYSTEM',
              postedBy: userId || 'SYSTEM',
              postedAt: new Date(Date.now() - 5 * 86400000),
              items: {
                create: [
                  {
                    productId: prodTea.id,
                    productNameSnapshot: prodTea.name,
                    skuSnapshot: prodTea.sku,
                    unitNameSnapshot: prodTea.unitCode,
                    quantity: teaQty,
                    purchaseRate: teaRate,
                    taxableAmount: teaTaxable,
                    taxRate: 5.0,
                    cgstRate: 2.5,
                    sgstRate: 2.5,
                    cgstAmount: teaCgst,
                    sgstAmount: teaSgst,
                    taxAmount: teaTax,
                    lineTotal: teaTotal,
                  },
                  {
                    productId: prodBoat.id,
                    productNameSnapshot: prodBoat.name,
                    skuSnapshot: prodBoat.sku,
                    unitNameSnapshot: prodBoat.unitCode,
                    quantity: boatQty,
                    purchaseRate: boatRate,
                    taxableAmount: boatTaxable,
                    taxRate: 18.0,
                    cgstRate: 9.0,
                    sgstRate: 9.0,
                    cgstAmount: boatCgst,
                    sgstAmount: boatSgst,
                    taxAmount: boatTax,
                    lineTotal: boatTotal,
                  },
                ],
              },
            },
          });
          purchasesCreated++;

          // Inward stock movements
          await tx.stockMovement.create({
            data: {
              companyId,
              productId: prodTea.id,
              locationId: defaultLocation.id,
              movementType: 'PURCHASE_RECEIPT',
              quantity: teaQty,
              unitCost: teaRate,
              referenceType: 'PURCHASE',
              referenceId: pur1.id,
              referenceNumber: pur1.purchaseNumber,
              notes: 'Inward receipt against PUR-DEMO-001 [DEMO_DATA]',
              createdBy: userId || 'SYSTEM',
            },
          });
          movementsCreated++;
          await tx.stockBalance.upsert({
            where: {
              companyId_productId_locationId: {
                companyId,
                productId: prodTea.id,
                locationId: defaultLocation.id,
              },
            },
            create: { companyId, productId: prodTea.id, locationId: defaultLocation.id, quantity: teaQty },
            update: { quantity: { increment: teaQty } },
          });
          await tx.product.update({
            where: { id: prodTea.id },
            data: { currentStock: { increment: teaQty } },
          });

          await tx.stockMovement.create({
            data: {
              companyId,
              productId: prodBoat.id,
              locationId: defaultLocation.id,
              movementType: 'PURCHASE_RECEIPT',
              quantity: boatQty,
              unitCost: boatRate,
              referenceType: 'PURCHASE',
              referenceId: pur1.id,
              referenceNumber: pur1.purchaseNumber,
              notes: 'Inward receipt against PUR-DEMO-001 [DEMO_DATA]',
              createdBy: userId || 'SYSTEM',
            },
          });
          movementsCreated++;
          await tx.stockBalance.upsert({
            where: {
              companyId_productId_locationId: {
                companyId,
                productId: prodBoat.id,
                locationId: defaultLocation.id,
              },
            },
            create: { companyId, productId: prodBoat.id, locationId: defaultLocation.id, quantity: boatQty },
            update: { quantity: { increment: boatQty } },
          });
          await tx.product.update({
            where: { id: prodBoat.id },
            data: { currentStock: { increment: boatQty } },
          });

          // Ledger credit
          const running1 = (sup1.currentBalance || 15000) + pur1GrandTotal;
          await tx.supplierLedger.create({
            data: {
              companyId,
              supplierId: sup1.id,
              entryDate: pur1.purchaseDate,
              transactionType: 'PURCHASE',
              referenceType: 'PURCHASE',
              referenceId: pur1.id,
              referenceNumber: pur1.purchaseNumber,
              creditAmount: pur1GrandTotal,
              runningBalance: running1,
              description: `Purchase #${pur1.purchaseNumber} (Inv: ${pur1.supplierInvoiceNumber}) [DEMO_DATA]`,
              createdBy: userId || 'SYSTEM',
            },
          });
          await tx.supplier.update({
            where: { id: sup1.id },
            data: { currentBalance: running1 },
          });
          sup1.currentBalance = running1;
        }

        // Purchase 2: PUR-DEMO-002 (Draft) with SUP-DEMO-02
        let pur2 = await tx.purchase.findFirst({
          where: { companyId, purchaseNumber: 'PUR-DEMO-002' },
        });
        if (!pur2) {
          const redBullQty = 25;
          const redBullRate = prodRedBull.cost;
          const redBullTaxable = redBullQty * redBullRate; // 2375
          const redBullTax = redBullTaxable * 0.18; // 427.5
          const redBullCgst = redBullTax / 2; // 213.75
          const redBullSgst = redBullTax / 2; // 213.75
          const redBullTotal = redBullTaxable + redBullTax; // 2802.5

          pur2 = await tx.purchase.create({
            data: {
              companyId,
              supplierId: sup2.id,
              purchaseNumber: 'PUR-DEMO-002',
              supplierInvoiceNumber: 'DRAFT-APEX-901',
              purchaseDate: new Date(),
              dueDate: new Date(Date.now() + 15 * 86400000),
              locationId: defaultLocation.id,
              status: 'DRAFT',
              subtotal: redBullTaxable,
              taxableAmount: redBullTaxable,
              cgstAmount: redBullCgst,
              sgstAmount: redBullSgst,
              grandTotal: redBullTotal,
              amountPaid: 0,
              amountReturned: 0,
              paymentStatus: 'UNPAID',
              notes: 'Draft order pending quotation approval [DEMO_DATA]',
              createdBy: userId || 'SYSTEM',
              items: {
                create: [
                  {
                    productId: prodRedBull.id,
                    productNameSnapshot: prodRedBull.name,
                    skuSnapshot: prodRedBull.sku,
                    unitNameSnapshot: prodRedBull.unitCode,
                    quantity: redBullQty,
                    purchaseRate: redBullRate,
                    taxableAmount: redBullTaxable,
                    taxRate: 18.0,
                    cgstRate: 9.0,
                    sgstRate: 9.0,
                    cgstAmount: redBullCgst,
                    sgstAmount: redBullSgst,
                    taxAmount: redBullTax,
                    lineTotal: redBullTotal,
                  },
                ],
              },
            },
          });
          purchasesCreated++;
        }

        // Purchase 3: PUR-DEMO-003 (Posted, Partially Paid) with SUP-DEMO-03
        let pur3 = await tx.purchase.findFirst({
          where: { companyId, purchaseNumber: 'PUR-DEMO-003' },
        });
        if (!pur3) {
          const cookQty = 50;
          const cookRate = prodCookies.cost;
          const cookTaxable = cookQty * cookRate; // 1900
          const cookTax = cookTaxable * 0.18; // 342
          const cookCgst = cookTax / 2; // 171
          const cookSgst = cookTax / 2; // 171
          const cookTotal = cookTaxable + cookTax; // 2242

          pur3 = await tx.purchase.create({
            data: {
              companyId,
              supplierId: sup3.id,
              purchaseNumber: 'PUR-DEMO-003',
              supplierInvoiceNumber: 'INV-HIM-104',
              purchaseDate: new Date(Date.now() - 2 * 86400000),
              dueDate: new Date(Date.now() + 5 * 86400000),
              locationId: defaultLocation.id,
              status: 'POSTED',
              subtotal: cookTaxable,
              taxableAmount: cookTaxable,
              cgstAmount: cookCgst,
              sgstAmount: cookSgst,
              grandTotal: cookTotal,
              amountPaid: 1000.0,
              amountReturned: 0,
              paymentStatus: 'PARTIALLY_PAID',
              notes: 'Weekly fresh dairy & confectionery supplies [DEMO_DATA]',
              createdBy: userId || 'SYSTEM',
              postedBy: userId || 'SYSTEM',
              postedAt: new Date(Date.now() - 2 * 86400000),
              items: {
                create: [
                  {
                    productId: prodCookies.id,
                    productNameSnapshot: prodCookies.name,
                    skuSnapshot: prodCookies.sku,
                    unitNameSnapshot: prodCookies.unitCode,
                    quantity: cookQty,
                    purchaseRate: cookRate,
                    taxableAmount: cookTaxable,
                    taxRate: 18.0,
                    cgstRate: 9.0,
                    sgstRate: 9.0,
                    cgstAmount: cookCgst,
                    sgstAmount: cookSgst,
                    taxAmount: cookTax,
                    lineTotal: cookTotal,
                  },
                ],
              },
            },
          });
          purchasesCreated++;

          // Inward receipt stock movement
          await tx.stockMovement.create({
            data: {
              companyId,
              productId: prodCookies.id,
              locationId: defaultLocation.id,
              movementType: 'PURCHASE_RECEIPT',
              quantity: cookQty,
              unitCost: cookRate,
              referenceType: 'PURCHASE',
              referenceId: pur3.id,
              referenceNumber: pur3.purchaseNumber,
              notes: 'Inward receipt against PUR-DEMO-003 [DEMO_DATA]',
              createdBy: userId || 'SYSTEM',
            },
          });
          movementsCreated++;
          await tx.stockBalance.upsert({
            where: {
              companyId_productId_locationId: {
                companyId,
                productId: prodCookies.id,
                locationId: defaultLocation.id,
              },
            },
            create: { companyId, productId: prodCookies.id, locationId: defaultLocation.id, quantity: cookQty },
            update: { quantity: { increment: cookQty } },
          });
          await tx.product.update({
            where: { id: prodCookies.id },
            data: { currentStock: { increment: cookQty } },
          });

          // Ledger credit for purchase
          let running3 = (sup3.currentBalance || 5000) + cookTotal;
          await tx.supplierLedger.create({
            data: {
              companyId,
              supplierId: sup3.id,
              entryDate: pur3.purchaseDate,
              transactionType: 'PURCHASE',
              referenceType: 'PURCHASE',
              referenceId: pur3.id,
              referenceNumber: pur3.purchaseNumber,
              creditAmount: cookTotal,
              runningBalance: running3,
              description: `Purchase #${pur3.purchaseNumber} (Inv: ${pur3.supplierInvoiceNumber}) [DEMO_DATA]`,
              createdBy: userId || 'SYSTEM',
            },
          });

          // Payment made: PAY-DEMO-001
          const pay1 = await tx.paymentMade.create({
            data: {
              companyId,
              supplierId: sup3.id,
              purchaseId: pur3.id,
              paymentNumber: 'PAY-DEMO-001',
              paymentDate: new Date(Date.now() - 1 * 86400000),
              amount: 1000.0,
              paymentMode: 'BANK_TRANSFER',
              referenceNo: 'TXN-DEMO-9912',
              status: 'POSTED',
              notes: 'Part-payment advance against PUR-DEMO-003 [DEMO_DATA]',
              createdBy: userId || 'SYSTEM',
            },
          });
          paymentsCreated++;

          running3 -= 1000.0;
          await tx.supplierLedger.create({
            data: {
              companyId,
              supplierId: sup3.id,
              entryDate: pay1.paymentDate,
              transactionType: 'PAYMENT',
              referenceType: 'PAYMENT',
              referenceId: pay1.id,
              referenceNumber: pay1.paymentNumber,
              debitAmount: 1000.0,
              runningBalance: running3,
              description: `Payment #${pay1.paymentNumber} via Bank Transfer [DEMO_DATA]`,
              createdBy: userId || 'SYSTEM',
            },
          });

          await tx.supplier.update({
            where: { id: sup3.id },
            data: { currentBalance: running3 },
          });
          sup3.currentBalance = running3;
        }

        // 12. Create Demo Purchase Return: PR-DEMO-001 against PUR-DEMO-001
        if (pur1) {
          let pr1 = await tx.purchaseReturn.findFirst({
            where: { companyId, returnNumber: 'PR-DEMO-001' },
          });
          if (!pr1) {
            const retQty = 2;
            const retRate = prodTea.cost;
            const retTaxable = retQty * retRate; // 480
            const retTax = retTaxable * 0.05; // 24
            const retCgst = retTax / 2; // 12
            const retSgst = retTax / 2; // 12
            const retTotal = retTaxable + retTax; // 504

            pr1 = await tx.purchaseReturn.create({
              data: {
                companyId,
                supplierId: sup1.id,
                purchaseId: pur1.id,
                returnNumber: 'PR-DEMO-001',
                returnDate: new Date(Date.now() - 1 * 86400000),
                locationId: defaultLocation.id,
                status: 'POSTED',
                subtotal: retTaxable,
                taxableAmount: retTaxable,
                cgstAmount: retCgst,
                sgstAmount: retSgst,
                grandTotal: retTotal,
                reason: 'Damaged packaging in transit [DEMO_DATA]',
                notes: 'Returned damaged tea packets to distributor [DEMO_DATA]',
                createdBy: userId || 'SYSTEM',
                approvedBy: userId || 'SYSTEM',
                postedBy: userId || 'SYSTEM',
                postedAt: new Date(Date.now() - 1 * 86400000),
                items: {
                  create: [
                    {
                      productId: prodTea.id,
                      productNameSnapshot: prodTea.name,
                      quantity: retQty,
                      returnRate: retRate,
                      taxRate: 5.0,
                      taxAmount: retTax,
                      lineTotal: retTotal,
                      reason: 'Damaged packaging [DEMO_DATA]',
                    },
                  ],
                },
              },
            });
            returnsCreated++;

            // Outward stock movement for return
            await tx.stockMovement.create({
              data: {
                companyId,
                productId: prodTea.id,
                locationId: defaultLocation.id,
                movementType: 'PURCHASE_RETURN',
                quantity: -retQty,
                unitCost: retRate,
                referenceType: 'PURCHASE_RETURN',
                referenceId: pr1.id,
                referenceNumber: pr1.returnNumber,
                notes: 'Outward purchase return against PR-DEMO-001 [DEMO_DATA]',
                createdBy: userId || 'SYSTEM',
              },
            });
            movementsCreated++;

            await tx.stockBalance.update({
              where: {
                companyId_productId_locationId: {
                  companyId,
                  productId: prodTea.id,
                  locationId: defaultLocation.id,
                },
              },
              data: { quantity: { decrement: retQty } },
            });
            await tx.product.update({
              where: { id: prodTea.id },
              data: { currentStock: { decrement: retQty } },
            });

            // Update purchase record amountReturned
            await tx.purchase.update({
              where: { id: pur1.id },
              data: { amountReturned: { increment: retTotal } },
            });

            // Supplier ledger debit entry
            const runningReturn = (sup1.currentBalance || 25645) - retTotal;
            await tx.supplierLedger.create({
              data: {
                companyId,
                supplierId: sup1.id,
                entryDate: pr1.returnDate,
                transactionType: 'PURCHASE_RETURN',
                referenceType: 'RETURN',
                referenceId: pr1.id,
                referenceNumber: pr1.returnNumber,
                debitAmount: retTotal,
                runningBalance: runningReturn,
                description: `Purchase Return #${pr1.returnNumber} against #${pur1.purchaseNumber} [DEMO_DATA]`,
                createdBy: userId || 'SYSTEM',
              },
            });
            await tx.supplier.update({
              where: { id: sup1.id },
              data: { currentBalance: runningReturn },
            });
          }
        }
      }  }

      // 13. Audit Log
      await this.auditService.log(
        {
          companyId,
          userId,
          action: 'DEMO_DATA_INSTALLED',
          module: 'SYSTEM',
          newValue: JSON.stringify({
            productsCreated,
            categoriesCreated,
            brandsCreated,
            locationsCreated,
            movementsCreated,
            adjustmentsCreated,
            transfersCreated,
            stocktakesCreated,
            suppliersCreated,
            purchasesCreated,
            paymentsCreated,
            returnsCreated,
          }),
        },
        tx as any,
      );

      return {
        success: true,
        categoriesCreated,
        brandsCreated,
        locationsCreated,
        productsCreated,
        movementsCreated,
        adjustmentsCreated,
        transfersCreated,
        stocktakesCreated,
        suppliersCreated,
        purchasesCreated,
        paymentsCreated,
        returnsCreated,
        message: `Successfully installed demo data with ${productsCreated} products, ${suppliersCreated} suppliers, ${purchasesCreated} purchase invoices, and inventory records.`,
      };
    });
  }

  public async clearDemoData(companyId: string, userId?: string): Promise<DemoDataClearResult> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new BusinessRuleError('Company not found.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Find all demo products
      const demoProducts = await tx.product.findMany({
        where: {
          companyId,
          OR: [
            { sku: { startsWith: 'DEMO-' } },
            { description: { contains: '[DEMO_DATA]' } },
          ],
        },
        select: { id: true },
      });
      const demoProductIds = demoProducts.map((p) => p.id);

      // Find all demo suppliers
      const demoSuppliers = await tx.supplier.findMany({
        where: {
          companyId,
          OR: [
            { supplierCode: { startsWith: 'SUP-DEMO-' } },
            { notes: { contains: '[DEMO_DATA]' } },
          ],
        },
        select: { id: true },
      });
      const demoSupplierIds = demoSuppliers.map((s) => s.id);

      // 1. Delete Demo Purchase Return Items & Returns
      const demoReturns = await tx.purchaseReturn.findMany({
        where: {
          companyId,
          OR: [
            { returnNumber: { startsWith: 'PR-DEMO' } },
            { notes: { contains: '[DEMO_DATA]' } },
            { supplierId: { in: demoSupplierIds } },
          ],
        },
        select: { id: true },
      });
      const demoReturnIds = demoReturns.map((r) => r.id);

      let returnsDeleted = 0;
      if (demoReturnIds.length > 0) {
        await tx.purchaseReturnItem.deleteMany({
          where: { purchaseReturnId: { in: demoReturnIds } },
        });
        const retRes = await tx.purchaseReturn.deleteMany({
          where: { id: { in: demoReturnIds } },
        });
        returnsDeleted = retRes.count;
      }
      if (demoProductIds.length > 0) {
        await tx.purchaseReturnItem.deleteMany({
          where: { productId: { in: demoProductIds } },
        });
      }

      // 2. Delete Demo Payments Made
      const payRes = await tx.paymentMade.deleteMany({
        where: {
          companyId,
          OR: [
            { paymentNumber: { startsWith: 'PAY-DEMO' } },
            { notes: { contains: '[DEMO_DATA]' } },
            { supplierId: { in: demoSupplierIds } },
          ],
        },
      });
      const paymentsDeleted = payRes.count;

      // 3. Delete Demo Purchase Items & Purchases
      const demoPurchases = await tx.purchase.findMany({
        where: {
          companyId,
          OR: [
            { purchaseNumber: { startsWith: 'PUR-DEMO' } },
            { notes: { contains: '[DEMO_DATA]' } },
            { supplierId: { in: demoSupplierIds } },
          ],
        },
        select: { id: true },
      });
      const demoPurchaseIds = demoPurchases.map((p) => p.id);

      let purchasesDeleted = 0;
      if (demoPurchaseIds.length > 0) {
        await tx.purchaseItem.deleteMany({
          where: { purchaseId: { in: demoPurchaseIds } },
        });
        const purRes = await tx.purchase.deleteMany({
          where: { id: { in: demoPurchaseIds } },
        });
        purchasesDeleted = purRes.count;
      }
      if (demoProductIds.length > 0) {
        await tx.purchaseItem.deleteMany({
          where: { productId: { in: demoProductIds } },
        });
      }

      // 4. Delete Demo Supplier Ledger & Suppliers
      await tx.supplierLedger.deleteMany({
        where: {
          companyId,
          OR: [
            { supplierId: { in: demoSupplierIds } },
            { description: { contains: '[DEMO_DATA]' } },
            { notes: { contains: '[DEMO_DATA]' } },
          ],
        },
      });

      let suppliersDeleted = 0;
      if (demoSupplierIds.length > 0) {
        const supRes = await tx.supplier.deleteMany({
          where: { id: { in: demoSupplierIds } },
        });
        suppliersDeleted = supRes.count;
      }

      // 5. Delete Demo Stocktake Items & Stocktakes
      const demoStocktakes = await tx.stocktake.findMany({
        where: {
          companyId,
          OR: [
            { stocktakeNumber: { startsWith: 'STK-DEMO' } },
            { notes: { contains: '[DEMO_DATA]' } },
          ],
        },
        select: { id: true },
      });
      const demoStocktakeIds = demoStocktakes.map((s) => s.id);

      let stocktakesDeleted = 0;
      if (demoStocktakeIds.length > 0) {
        await tx.stocktakeItem.deleteMany({
          where: { stocktakeId: { in: demoStocktakeIds } },
        });
        const stRes = await tx.stocktake.deleteMany({
          where: { id: { in: demoStocktakeIds } },
        });
        stocktakesDeleted = stRes.count;
      }

      // Also clean up any orphan stocktake items for demo products
      if (demoProductIds.length > 0) {
        await tx.stocktakeItem.deleteMany({
          where: { productId: { in: demoProductIds } },
        });
      }

      // 6. Delete Demo Stock Transfer Items & Stock Transfers
      const demoTransfers = await tx.stockTransfer.findMany({
        where: {
          companyId,
          OR: [
            { transferNumber: { startsWith: 'TRF-DEMO' } },
            { notes: { contains: '[DEMO_DATA]' } },
          ],
        },
        select: { id: true },
      });
      const demoTransferIds = demoTransfers.map((t) => t.id);

      let transfersDeleted = 0;
      if (demoTransferIds.length > 0) {
        await tx.stockTransferItem.deleteMany({
          where: { transferId: { in: demoTransferIds } },
        });
        const trRes = await tx.stockTransfer.deleteMany({
          where: { id: { in: demoTransferIds } },
        });
        transfersDeleted = trRes.count;
      }

      if (demoProductIds.length > 0) {
        await tx.stockTransferItem.deleteMany({
          where: { productId: { in: demoProductIds } },
        });
      }

      // 7. Delete Demo Stock Adjustment Items & Stock Adjustments
      const demoAdjustments = await tx.stockAdjustment.findMany({
        where: {
          companyId,
          OR: [
            { adjustmentNumber: { startsWith: 'ADJ-DEMO' } },
            { reason: { contains: '[DEMO_DATA]' } },
            { notes: { contains: '[DEMO_DATA]' } },
          ],
        },
        select: { id: true },
      });
      const demoAdjustmentIds = demoAdjustments.map((a) => a.id);

      let adjustmentsDeleted = 0;
      if (demoAdjustmentIds.length > 0) {
        await tx.stockAdjustmentItem.deleteMany({
          where: { adjustmentId: { in: demoAdjustmentIds } },
        });
        const adjRes = await tx.stockAdjustment.deleteMany({
          where: { id: { in: demoAdjustmentIds } },
        });
        adjustmentsDeleted = adjRes.count;
      }

      if (demoProductIds.length > 0) {
        await tx.stockAdjustmentItem.deleteMany({
          where: { productId: { in: demoProductIds } },
        });
      }

      // 8. Delete Stock Movements for demo products & demo notes
      const moveRes = await tx.stockMovement.deleteMany({
        where: {
          companyId,
          OR: [
            { productId: { in: demoProductIds } },
            { notes: { contains: '[DEMO_DATA]' } },
          ],
        },
      });
      const movementsDeleted = moveRes.count;

      // 9. Delete Stock Balances for demo products
      if (demoProductIds.length > 0) {
        await tx.stockBalance.deleteMany({
          where: {
            companyId,
            productId: { in: demoProductIds },
          },
        });

        // 10. Delete Product Price History
        await tx.productPriceHistory.deleteMany({
          where: {
            productId: { in: demoProductIds },
          },
        });
      }

      // 11. Delete Demo Products
      const prodRes = await tx.product.deleteMany({
        where: {
          companyId,
          OR: [
            { sku: { startsWith: 'DEMO-' } },
            { description: { contains: '[DEMO_DATA]' } },
          ],
        },
      });
      const productsDeleted = prodRes.count;

      // 12. Delete Demo Locations (non-default only)
      const locRes = await tx.inventoryLocation.deleteMany({
        where: {
          companyId,
          isDefault: false,
          OR: [
            { code: { startsWith: 'DEMO-' } },
            { description: { contains: '[DEMO_DATA]' } },
          ],
        },
      });
      const locationsDeleted = locRes.count;

      // 13. Delete Demo Brands (only if no non-demo products reference them)
      const demoBrands = await tx.brand.findMany({
        where: {
          companyId,
          description: { contains: '[DEMO_DATA]' },
        },
        include: { _count: { select: { products: true } } },
      });
      let brandsDeleted = 0;
      for (const br of demoBrands) {
        if (br._count.products === 0) {
          await tx.brand.delete({ where: { id: br.id } });
          brandsDeleted++;
        }
      }

      // 14. Delete Demo Categories (only if no non-demo products reference them)
      const demoCategories = await tx.category.findMany({
        where: {
          companyId,
          description: { contains: '[DEMO_DATA]' },
        },
        include: { _count: { select: { products: true } } },
      });
      let categoriesDeleted = 0;
      for (const cat of demoCategories) {
        if (cat._count.products === 0) {
          await tx.category.delete({ where: { id: cat.id } });
          categoriesDeleted++;
        }
      }

      // 15. Audit Log
      await this.auditService.log(
        {
          companyId,
          userId,
          action: 'DEMO_DATA_CLEARED',
          module: 'SYSTEM',
          newValue: JSON.stringify({
            productsDeleted,
            categoriesDeleted,
            brandsDeleted,
            locationsDeleted,
            movementsDeleted,
            adjustmentsDeleted,
            transfersDeleted,
            stocktakesDeleted,
            suppliersDeleted,
            purchasesDeleted,
            paymentsDeleted,
            returnsDeleted,
          }),
        },
        tx as any,
      );

      return {
        success: true,
        productsDeleted,
        categoriesDeleted,
        brandsDeleted,
        locationsDeleted,
        movementsDeleted,
        adjustmentsDeleted,
        transfersDeleted,
        stocktakesDeleted,
        suppliersDeleted,
        purchasesDeleted,
        paymentsDeleted,
        returnsDeleted,
        message: `Successfully cleared demo data (${productsDeleted} products, ${suppliersDeleted} suppliers, ${purchasesDeleted} purchases removed).`,
      };
    });
  }
}
