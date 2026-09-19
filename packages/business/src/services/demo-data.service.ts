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
      demoCustomersCount,
      demoSalesCount,
      demoSalesPaymentsCount,
      demoSalesReturnsCount,
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
      this.prisma.customer.count({
        where: {
          companyId,
          OR: [
            { customerCode: { startsWith: 'CUST-DEMO-' } },
            { notes: { contains: '[DEMO_DATA]' } },
          ],
        },
      }),
      this.prisma.salesInvoice.count({
        where: {
          companyId,
          OR: [
            { invoiceNumber: { startsWith: 'INV-DEMO-' } },
            { notes: { contains: '[DEMO_DATA]' } },
          ],
        },
      }),
      this.prisma.salesPayment.count({
        where: {
          companyId,
          OR: [
            { paymentNumber: { startsWith: 'SPAY-DEMO-' } },
            { notes: { contains: '[DEMO_DATA]' } },
          ],
        },
      }),
      this.prisma.salesReturn.count({
        where: {
          companyId,
          OR: [
            { returnNumber: { startsWith: 'SR-DEMO-' } },
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
        demoPurchasesCount > 0 ||
        demoCustomersCount > 0 ||
        demoSalesCount > 0,
      demoProductsCount,
      demoCategoriesCount,
      demoBrandsCount,
      demoLocationsCount,
      demoMovementsCount,
      demoSuppliersCount,
      demoPurchasesCount,
      demoPaymentsCount,
      demoReturnsCount,
      demoCustomersCount,
      demoSalesCount,
      demoSalesPaymentsCount,
      demoSalesReturnsCount,
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
      const createdProducts: Array<{
        id: string;
        name: string;
        sku: string;
        cost: number;
        taxRate: number;
        unitCode: string;
        sellingPrice: number;
        mrp: number;
        hsnCode?: string | null;
        barcode?: string | null;
      }> = [];

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
          sellingPrice: existing.sellingPrice,
          mrp: existing.mrp,
          hsnCode: existing.hsnCode,
          barcode: existing.barcode,
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
      }

      // 13. Create Demo Customers
      let customersCreated = 0;
      const demoCustomersData = [
        {
          customerCode: 'CUST-DEMO-001',
          name: 'Ramesh Sharma',
          contactPerson: 'Ramesh Sharma',
          phone: '9820198201',
          email: 'ramesh.sharma@example.com',
          customerType: 'INDIVIDUAL',
          addressLine1: 'B-204, Gokul Dham Society, Borivali West',
          city: 'Mumbai',
          state: 'Maharashtra',
          pinCode: '400092',
          registrationType: 'CONSUMER',
          openingBalance: 2500,
          openingBalanceType: 'RECEIVABLE',
          creditLimit: 10000,
          creditPeriodDays: 30,
          notes: 'Loyal neighborhood customer with active Khata credit [DEMO_DATA]',
        },
        {
          customerCode: 'CUST-DEMO-002',
          name: 'Pooja Verma',
          contactPerson: 'Pooja Verma',
          phone: '9811234567',
          email: 'pooja.verma@example.com',
          customerType: 'INDIVIDUAL',
          addressLine1: 'Flat 402, Sunshine Heights, Andheri East',
          city: 'Mumbai',
          state: 'Maharashtra',
          pinCode: '400069',
          registrationType: 'CONSUMER',
          openingBalance: 0,
          openingBalanceType: 'RECEIVABLE',
          creditLimit: 0,
          creditPeriodDays: 0,
          notes: 'Regular walk-in retail counter shopper [DEMO_DATA]',
        },
        {
          customerCode: 'CUST-DEMO-003',
          name: 'Apex Corporate Supplies',
          contactPerson: 'Rajesh Gupta',
          phone: '9892098920',
          email: 'purchase@apexcorporate.in',
          customerType: 'BUSINESS',
          addressLine1: 'Plot 45, MIDC Industrial Area, Hinjewadi Phase 1',
          city: 'Pune',
          state: 'Maharashtra',
          pinCode: '411057',
          gstin: '27AABCA1234F1Z5',
          registrationType: 'REGULAR',
          openingBalance: 0,
          openingBalanceType: 'RECEIVABLE',
          creditLimit: 50000,
          creditPeriodDays: 45,
          notes: 'Corporate pantry & supplies B2B client [DEMO_DATA]',
        },
        {
          customerCode: 'CUST-DEMO-004',
          name: 'Vikram Electronics & Retail',
          contactPerson: 'Vikram Singh',
          phone: '9910099100',
          email: 'vikram.singh@velretail.com',
          customerType: 'BUSINESS',
          addressLine1: 'Shop 12, Galleria Market, DLF Phase 4',
          city: 'Gurugram',
          state: 'Haryana',
          pinCode: '122002',
          gstin: '06ABCDE1234F1Z2',
          registrationType: 'REGULAR',
          openingBalance: 0,
          openingBalanceType: 'RECEIVABLE',
          creditLimit: 25000,
          creditPeriodDays: 15,
          notes: 'Interstate trade customer for IGST sales [DEMO_DATA]',
        },
        {
          customerCode: 'CUST-DEMO-005',
          name: 'Anita Desai',
          contactPerson: 'Anita Desai',
          phone: '9845098450',
          email: 'anita.desai@example.com',
          customerType: 'INDIVIDUAL',
          addressLine1: '14, Silver Oak Apartments, Bandra West',
          city: 'Mumbai',
          state: 'Maharashtra',
          pinCode: '400050',
          registrationType: 'CONSUMER',
          openingBalance: 650,
          openingBalanceType: 'RECEIVABLE',
          creditLimit: 5000,
          creditPeriodDays: 15,
          notes: 'Local customer with small running credit balance [DEMO_DATA]',
        },
      ];

      const customerMap: Record<string, any> = {};
      for (const c of demoCustomersData) {
        let cust = await tx.customer.findFirst({
          where: { companyId, customerCode: c.customerCode },
        });

        if (!cust) {
          cust = await tx.customer.create({
            data: {
              companyId,
              customerCode: c.customerCode,
              name: c.name,
              contactPerson: c.contactPerson,
              phone: c.phone,
              email: c.email,
              customerType: c.customerType,
              addressLine1: c.addressLine1,
              city: c.city,
              state: c.state,
              pinCode: c.pinCode,
              country: 'India',
              gstin: c.gstin,
              registrationType: c.registrationType,
              openingBalance: c.openingBalance,
              openingBalanceType: c.openingBalanceType,
              openingBalanceDate: c.openingBalance > 0 ? new Date(Date.now() - 30 * 86400000) : null,
              creditLimit: c.creditLimit,
              creditPeriodDays: c.creditPeriodDays,
              currentBalance: c.openingBalance,
              notes: c.notes,
              createdBy: userId || 'SYSTEM',
            },
          });
          customersCreated++;

          if (c.openingBalance > 0) {
            await tx.customerLedger.create({
              data: {
                companyId,
                customerId: cust.id,
                entryDate: new Date(Date.now() - 30 * 86400000),
                transactionType: 'OPENING_BALANCE',
                referenceType: 'OPENING_BALANCE',
                debitAmount: c.openingBalance,
                creditAmount: 0,
                runningBalance: c.openingBalance,
                description: `Opening Balance [DEMO_DATA]`,
                notes: c.notes,
                createdBy: userId || 'SYSTEM',
              },
            });
          }
        }
        customerMap[c.customerCode] = cust;
      }

      // Map created products by SKU for sales billing
      const prodMap: Record<string, typeof createdProducts[0]> = {};
      for (const cp of createdProducts) {
        prodMap[cp.sku] = cp;
      }

      let salesCreated = 0;
      let salesPaymentsCreated = 0;
      let salesReturnsCreated = 0;

      const cust1 = customerMap['CUST-DEMO-001'];
      const cust2 = customerMap['CUST-DEMO-002'];
      const cust4 = customerMap['CUST-DEMO-004'];
      const cust5 = customerMap['CUST-DEMO-005'];

      const prodTea = prodMap['DEMO-BEV-001']!;
      const prodRedBull = prodMap['DEMO-BEV-002']!;
      const prodBiscuits = prodMap['DEMO-SNK-001']!;
      const prodMaggi = prodMap['DEMO-SNK-002']!;
      const prodSilk = prodMap['DEMO-SNK-003']!;
      const prodButter = prodMap['DEMO-DAI-001']!;
      const prodDal = prodMap['DEMO-DAI-003']!;
      const prodEarphones = prodMap['DEMO-ELE-001']!;
      const prodSpeaker = prodMap['DEMO-ELE-002']!;
      const prodLedBulb = prodMap['DEMO-ELE-003']!;
      const prodSpiral = prodMap['DEMO-STA-001']!;
      const prodPack6 = prodMap['DEMO-STA-002']!;

      // 14. Demo Sales Invoices
      // Invoice 1: INV-DEMO-001 (Cash POS Counter Sale)
      let inv1 = await tx.salesInvoice.findFirst({
        where: { companyId, invoiceNumber: 'INV-DEMO-001' },
      });
      if (!inv1 && cust2) {
        const teaQty = 2;
        const teaRate = 265;
        const teaTaxable = teaQty * teaRate; // 530
        const teaCgst = teaTaxable * 0.025; // 13.25
        const teaSgst = teaTaxable * 0.025; // 13.25
        const teaLineTotal = teaTaxable + teaCgst + teaSgst; // 556.50

        const biscQty = 1;
        const biscRate = 85;
        const biscTaxable = biscQty * biscRate; // 85
        const biscCgst = biscTaxable * 0.025; // 2.125
        const biscSgst = biscTaxable * 0.025; // 2.125
        const biscLineTotal = biscTaxable + biscCgst + biscSgst; // 89.25

        const subtotal1 = teaTaxable + biscTaxable; // 615
        const grandTotal1 = 646.0;
        const roundOff1 = 0.25;

        inv1 = await tx.salesInvoice.create({
          data: {
            companyId,
            customerId: cust2.id,
            invoiceNumber: 'INV-DEMO-001',
            invoiceType: 'RETAIL',
            invoiceDate: new Date(Date.now() - 5 * 86400000),
            locationId: defaultLocation.id,
            status: 'POSTED',
            customerNameSnapshot: cust2.name,
            customerPhoneSnapshot: cust2.phone,
            customerAddressSnapshot: `${cust2.addressLine1}, ${cust2.city}`,
            subtotal: subtotal1,
            taxableAmount: subtotal1,
            cgstAmount: 15.38,
            sgstAmount: 15.37,
            roundOff: roundOff1,
            grandTotal: grandTotal1,
            amountPaid: grandTotal1,
            amountReturned: 0,
            paymentStatus: 'PAID',
            notes: 'Walk-in cash counter sale [DEMO_DATA]',
            createdBy: userId || 'SYSTEM',
            postedBy: userId || 'SYSTEM',
            postedAt: new Date(Date.now() - 5 * 86400000),
            items: {
              create: [
                {
                  companyId,
                  productId: prodTea.id,
                  productNameSnapshot: prodTea.name,
                  skuSnapshot: prodTea.sku,
                  barcodeSnapshot: prodTea.barcode,
                  unitNameSnapshot: prodTea.unitCode,
                  hsnCodeSnapshot: prodTea.hsnCode,
                  quantity: teaQty,
                  sellingRate: teaRate,
                  taxableAmount: teaTaxable,
                  taxRate: 5.0,
                  cgstRate: 2.5,
                  sgstRate: 2.5,
                  cgstAmount: 13.25,
                  sgstAmount: 13.25,
                  taxAmount: 26.50,
                  lineTotal: teaLineTotal,
                  unitCostSnapshot: prodTea.cost,
                },
                {
                  companyId,
                  productId: prodBiscuits.id,
                  productNameSnapshot: prodBiscuits.name,
                  skuSnapshot: prodBiscuits.sku,
                  barcodeSnapshot: prodBiscuits.barcode,
                  unitNameSnapshot: prodBiscuits.unitCode,
                  hsnCodeSnapshot: prodBiscuits.hsnCode,
                  quantity: biscQty,
                  sellingRate: biscRate,
                  taxableAmount: biscTaxable,
                  taxRate: 5.0,
                  cgstRate: 2.5,
                  sgstRate: 2.5,
                  cgstAmount: 2.13,
                  sgstAmount: 2.12,
                  taxAmount: 4.25,
                  lineTotal: biscLineTotal,
                  unitCostSnapshot: prodBiscuits.cost,
                },
              ],
            },
          },
        });
        salesCreated++;

        // Stock deductions & movements
        await tx.stockMovement.createMany({
          data: [
            {
              companyId,
              productId: prodTea.id,
              locationId: defaultLocation.id,
              movementType: 'SALE',
              quantity: -teaQty,
              unitCost: prodTea.cost,
              referenceType: 'SALE',
              referenceId: inv1.id,
              referenceNumber: inv1.invoiceNumber,
              notes: 'Outward sale against INV-DEMO-001 [DEMO_DATA]',
              createdBy: userId || 'SYSTEM',
            },
            {
              companyId,
              productId: prodBiscuits.id,
              locationId: defaultLocation.id,
              movementType: 'SALE',
              quantity: -biscQty,
              unitCost: prodBiscuits.cost,
              referenceType: 'SALE',
              referenceId: inv1.id,
              referenceNumber: inv1.invoiceNumber,
              notes: 'Outward sale against INV-DEMO-001 [DEMO_DATA]',
              createdBy: userId || 'SYSTEM',
            },
          ],
        });
        movementsCreated += 2;

        await tx.stockBalance.update({
          where: { companyId_productId_locationId: { companyId, productId: prodTea.id, locationId: defaultLocation.id } },
          data: { quantity: { decrement: teaQty } },
        });
        await tx.product.update({
          where: { id: prodTea.id },
          data: { currentStock: { decrement: teaQty } },
        });

        await tx.stockBalance.update({
          where: { companyId_productId_locationId: { companyId, productId: prodBiscuits.id, locationId: defaultLocation.id } },
          data: { quantity: { decrement: biscQty } },
        });
        await tx.product.update({
          where: { id: prodBiscuits.id },
          data: { currentStock: { decrement: biscQty } },
        });

        // Payment record
        const pay1 = await tx.salesPayment.create({
          data: {
            companyId,
            customerId: cust2.id,
            salesInvoiceId: inv1.id,
            paymentNumber: 'SPAY-DEMO-001',
            paymentDate: inv1.invoiceDate,
            amount: grandTotal1,
            paymentMode: 'CASH',
            status: 'POSTED',
            notes: 'Cash payment received at counter [DEMO_DATA]',
            createdBy: userId || 'SYSTEM',
          },
        });
        salesPaymentsCreated++;

        // Customer Ledger entries
        await tx.customerLedger.create({
          data: {
            companyId,
            customerId: cust2.id,
            entryDate: inv1.invoiceDate,
            transactionType: 'SALE',
            referenceType: 'INVOICE',
            referenceId: inv1.id,
            referenceNumber: inv1.invoiceNumber,
            debitAmount: grandTotal1,
            creditAmount: 0,
            runningBalance: grandTotal1,
            description: `Retail POS Sale #${inv1.invoiceNumber} [DEMO_DATA]`,
            createdBy: userId || 'SYSTEM',
          },
        });
        await tx.customerLedger.create({
          data: {
            companyId,
            customerId: cust2.id,
            entryDate: inv1.invoiceDate,
            transactionType: 'PAYMENT',
            referenceType: 'PAYMENT',
            referenceId: pay1.id,
            referenceNumber: pay1.paymentNumber,
            debitAmount: 0,
            creditAmount: grandTotal1,
            runningBalance: 0,
            description: `Counter Cash Settlement #${pay1.paymentNumber} [DEMO_DATA]`,
            createdBy: userId || 'SYSTEM',
          },
        });
      }

      // Invoice 2: INV-DEMO-002 (UPI POS Counter Sale)
      let inv2 = await tx.salesInvoice.findFirst({
        where: { companyId, invoiceNumber: 'INV-DEMO-002' },
        include: { items: true },
      });
      if (!inv2 && cust2) {
        const rbQty = 4;
        const rbRate = 120;
        const rbTaxable = rbQty * rbRate; // 480
        const rbCgst = rbTaxable * 0.09; // 43.20
        const rbSgst = rbTaxable * 0.09; // 43.20
        const rbLineTotal = rbTaxable + rbCgst + rbSgst; // 566.40

        const earQty = 1;
        const earRate = 499;
        const earTaxable = earQty * earRate; // 499
        const earCgst = earTaxable * 0.09; // 44.91
        const earSgst = earTaxable * 0.09; // 44.91
        const earLineTotal = earTaxable + earCgst + earSgst; // 588.82

        const subtotal2 = rbTaxable + earTaxable; // 979.00
        const cgst2 = rbCgst + earCgst; // 88.11
        const sgst2 = rbSgst + earSgst; // 88.11
        const grandTotal2 = 1155.00;
        const roundOff2 = -0.22;

        inv2 = await tx.salesInvoice.create({
          data: {
            companyId,
            customerId: cust2.id,
            invoiceNumber: 'INV-DEMO-002',
            invoiceType: 'RETAIL',
            invoiceDate: new Date(Date.now() - 3 * 86400000),
            locationId: defaultLocation.id,
            status: 'POSTED',
            customerNameSnapshot: cust2.name,
            customerPhoneSnapshot: cust2.phone,
            customerAddressSnapshot: `${cust2.addressLine1}, ${cust2.city}`,
            subtotal: subtotal2,
            taxableAmount: subtotal2,
            cgstAmount: cgst2,
            sgstAmount: sgst2,
            roundOff: roundOff2,
            grandTotal: grandTotal2,
            amountPaid: grandTotal2,
            amountReturned: 0,
            paymentStatus: 'PAID',
            notes: 'Quick UPI counter sale [DEMO_DATA]',
            createdBy: userId || 'SYSTEM',
            postedBy: userId || 'SYSTEM',
            postedAt: new Date(Date.now() - 3 * 86400000),
            items: {
              create: [
                {
                  companyId,
                  productId: prodRedBull.id,
                  productNameSnapshot: prodRedBull.name,
                  skuSnapshot: prodRedBull.sku,
                  barcodeSnapshot: prodRedBull.barcode,
                  unitNameSnapshot: prodRedBull.unitCode,
                  hsnCodeSnapshot: prodRedBull.hsnCode,
                  quantity: rbQty,
                  sellingRate: rbRate,
                  taxableAmount: rbTaxable,
                  taxRate: 18.0,
                  cgstRate: 9.0,
                  sgstRate: 9.0,
                  cgstAmount: rbCgst,
                  sgstAmount: rbSgst,
                  taxAmount: rbCgst + rbSgst,
                  lineTotal: rbLineTotal,
                  unitCostSnapshot: prodRedBull.cost,
                },
                {
                  companyId,
                  productId: prodEarphones.id,
                  productNameSnapshot: prodEarphones.name,
                  skuSnapshot: prodEarphones.sku,
                  barcodeSnapshot: prodEarphones.barcode,
                  unitNameSnapshot: prodEarphones.unitCode,
                  hsnCodeSnapshot: prodEarphones.hsnCode,
                  quantity: earQty,
                  sellingRate: earRate,
                  taxableAmount: earTaxable,
                  taxRate: 18.0,
                  cgstRate: 9.0,
                  sgstRate: 9.0,
                  cgstAmount: earCgst,
                  sgstAmount: earSgst,
                  taxAmount: earCgst + earSgst,
                  lineTotal: earLineTotal,
                  unitCostSnapshot: prodEarphones.cost,
                },
              ],
            },
          },
          include: { items: true },
        });
        salesCreated++;

        // Stock deductions & movements
        await tx.stockMovement.createMany({
          data: [
            {
              companyId,
              productId: prodRedBull.id,
              locationId: defaultLocation.id,
              movementType: 'SALE',
              quantity: -rbQty,
              unitCost: prodRedBull.cost,
              referenceType: 'SALE',
              referenceId: inv2.id,
              referenceNumber: inv2.invoiceNumber,
              notes: 'Outward sale against INV-DEMO-002 [DEMO_DATA]',
              createdBy: userId || 'SYSTEM',
            },
            {
              companyId,
              productId: prodEarphones.id,
              locationId: defaultLocation.id,
              movementType: 'SALE',
              quantity: -earQty,
              unitCost: prodEarphones.cost,
              referenceType: 'SALE',
              referenceId: inv2.id,
              referenceNumber: inv2.invoiceNumber,
              notes: 'Outward sale against INV-DEMO-002 [DEMO_DATA]',
              createdBy: userId || 'SYSTEM',
            },
          ],
        });
        movementsCreated += 2;

        await tx.stockBalance.update({
          where: { companyId_productId_locationId: { companyId, productId: prodRedBull.id, locationId: defaultLocation.id } },
          data: { quantity: { decrement: rbQty } },
        });
        await tx.product.update({
          where: { id: prodRedBull.id },
          data: { currentStock: { decrement: rbQty } },
        });

        await tx.stockBalance.update({
          where: { companyId_productId_locationId: { companyId, productId: prodEarphones.id, locationId: defaultLocation.id } },
          data: { quantity: { decrement: earQty } },
        });
        await tx.product.update({
          where: { id: prodEarphones.id },
          data: { currentStock: { decrement: earQty } },
        });

        // Payment record
        await tx.salesPayment.create({
          data: {
            companyId,
            customerId: cust2.id,
            salesInvoiceId: inv2.id,
            paymentNumber: 'SPAY-DEMO-002',
            paymentDate: inv2.invoiceDate,
            amount: grandTotal2,
            paymentMode: 'UPI',
            referenceNo: 'UPI/9876543210/OKAXIS',
            status: 'POSTED',
            notes: 'Instant UPI settlement via QR Code [DEMO_DATA]',
            createdBy: userId || 'SYSTEM',
          },
        });
        salesPaymentsCreated++;
      }

      // Invoice 3: INV-DEMO-003 (Khata Credit Sale to Ramesh Sharma)
      let inv3 = await tx.salesInvoice.findFirst({
        where: { companyId, invoiceNumber: 'INV-DEMO-003' },
      });
      if (!inv3 && cust1) {
        const butterQty = 2;
        const butterRate = 265;
        const butterTaxable = butterQty * butterRate; // 530
        const butterCgst = butterTaxable * 0.06; // 31.80
        const butterSgst = butterTaxable * 0.06; // 31.80
        const butterLineTotal = butterTaxable + butterCgst + butterSgst; // 593.60

        const maggiQty = 2;
        const maggiRate = 55;
        const maggiTaxable = maggiQty * maggiRate; // 110
        const maggiCgst = maggiTaxable * 0.06; // 6.60
        const maggiSgst = maggiTaxable * 0.06; // 6.60
        const maggiLineTotal = maggiTaxable + maggiCgst + maggiSgst; // 123.20

        const bulbQty = 1;
        const bulbRate = 110;
        const bulbTaxable = bulbQty * bulbRate; // 110
        const bulbCgst = bulbTaxable * 0.06; // 6.60
        const bulbSgst = bulbTaxable * 0.06; // 6.60
        const bulbLineTotal = bulbTaxable + bulbCgst + bulbSgst; // 123.20

        const dalQty = 4;
        const dalRate = 160;
        const dalTaxable = dalQty * dalRate; // 640
        const dalCgst = dalTaxable * 0.025; // 16.00
        const dalSgst = dalTaxable * 0.025; // 16.00
        const dalLineTotal = dalTaxable + dalCgst + dalSgst; // 672.00

        const subtotal3 = butterTaxable + maggiTaxable + bulbTaxable + dalTaxable; // 1390.00
        const cgst3 = butterCgst + maggiCgst + bulbCgst + dalCgst; // 61.00
        const sgst3 = butterSgst + maggiSgst + bulbSgst + dalSgst; // 61.00
        const grandTotal3 = 1512.00;

        inv3 = await tx.salesInvoice.create({
          data: {
            companyId,
            customerId: cust1.id,
            invoiceNumber: 'INV-DEMO-003',
            invoiceType: 'CREDIT_SALE',
            invoiceDate: new Date(Date.now() - 2 * 86400000),
            dueDate: new Date(Date.now() + 28 * 86400000),
            locationId: defaultLocation.id,
            status: 'POSTED',
            customerNameSnapshot: cust1.name,
            customerPhoneSnapshot: cust1.phone,
            customerAddressSnapshot: `${cust1.addressLine1}, ${cust1.city}`,
            subtotal: subtotal3,
            taxableAmount: subtotal3,
            cgstAmount: cgst3,
            sgstAmount: sgst3,
            roundOff: 0.0,
            grandTotal: grandTotal3,
            amountPaid: 0.0,
            amountReturned: 0,
            paymentStatus: 'UNPAID',
            notes: 'Khata credit sale booked to customer ledger [DEMO_DATA]',
            createdBy: userId || 'SYSTEM',
            postedBy: userId || 'SYSTEM',
            postedAt: new Date(Date.now() - 2 * 86400000),
            items: {
              create: [
                {
                  companyId,
                  productId: prodButter.id,
                  productNameSnapshot: prodButter.name,
                  skuSnapshot: prodButter.sku,
                  barcodeSnapshot: prodButter.barcode,
                  unitNameSnapshot: prodButter.unitCode,
                  hsnCodeSnapshot: prodButter.hsnCode,
                  quantity: butterQty,
                  sellingRate: butterRate,
                  taxableAmount: butterTaxable,
                  taxRate: 12.0,
                  cgstRate: 6.0,
                  sgstRate: 6.0,
                  cgstAmount: butterCgst,
                  sgstAmount: butterSgst,
                  taxAmount: butterCgst + butterSgst,
                  lineTotal: butterLineTotal,
                  unitCostSnapshot: prodButter.cost,
                },
                {
                  companyId,
                  productId: prodMaggi.id,
                  productNameSnapshot: prodMaggi.name,
                  skuSnapshot: prodMaggi.sku,
                  barcodeSnapshot: prodMaggi.barcode,
                  unitNameSnapshot: prodMaggi.unitCode,
                  hsnCodeSnapshot: prodMaggi.hsnCode,
                  quantity: maggiQty,
                  sellingRate: maggiRate,
                  taxableAmount: maggiTaxable,
                  taxRate: 12.0,
                  cgstRate: 6.0,
                  sgstRate: 6.0,
                  cgstAmount: maggiCgst,
                  sgstAmount: maggiSgst,
                  taxAmount: maggiCgst + maggiSgst,
                  lineTotal: maggiLineTotal,
                  unitCostSnapshot: prodMaggi.cost,
                },
                {
                  companyId,
                  productId: prodLedBulb.id,
                  productNameSnapshot: prodLedBulb.name,
                  skuSnapshot: prodLedBulb.sku,
                  barcodeSnapshot: prodLedBulb.barcode,
                  unitNameSnapshot: prodLedBulb.unitCode,
                  hsnCodeSnapshot: prodLedBulb.hsnCode,
                  quantity: bulbQty,
                  sellingRate: bulbRate,
                  taxableAmount: bulbTaxable,
                  taxRate: 12.0,
                  cgstRate: 6.0,
                  sgstRate: 6.0,
                  cgstAmount: bulbCgst,
                  sgstAmount: bulbSgst,
                  taxAmount: bulbCgst + bulbSgst,
                  lineTotal: bulbLineTotal,
                  unitCostSnapshot: prodLedBulb.cost,
                },
                {
                  companyId,
                  productId: prodDal.id,
                  productNameSnapshot: prodDal.name,
                  skuSnapshot: prodDal.sku,
                  barcodeSnapshot: prodDal.barcode,
                  unitNameSnapshot: prodDal.unitCode,
                  hsnCodeSnapshot: prodDal.hsnCode,
                  quantity: dalQty,
                  sellingRate: dalRate,
                  taxableAmount: dalTaxable,
                  taxRate: 5.0,
                  cgstRate: 2.5,
                  sgstRate: 2.5,
                  cgstAmount: dalCgst,
                  sgstAmount: dalSgst,
                  taxAmount: dalCgst + dalSgst,
                  lineTotal: dalLineTotal,
                  unitCostSnapshot: prodDal.cost,
                },
              ],
            },
          },
        });
        salesCreated++;

        // Deduct inventory
        await tx.stockMovement.createMany({
          data: [
            {
              companyId,
              productId: prodButter.id,
              locationId: defaultLocation.id,
              movementType: 'SALE',
              quantity: -butterQty,
              unitCost: prodButter.cost,
              referenceType: 'SALE',
              referenceId: inv3.id,
              referenceNumber: inv3.invoiceNumber,
              notes: 'Outward sale against INV-DEMO-003 [DEMO_DATA]',
              createdBy: userId || 'SYSTEM',
            },
            {
              companyId,
              productId: prodMaggi.id,
              locationId: defaultLocation.id,
              movementType: 'SALE',
              quantity: -maggiQty,
              unitCost: prodMaggi.cost,
              referenceType: 'SALE',
              referenceId: inv3.id,
              referenceNumber: inv3.invoiceNumber,
              notes: 'Outward sale against INV-DEMO-003 [DEMO_DATA]',
              createdBy: userId || 'SYSTEM',
            },
            {
              companyId,
              productId: prodLedBulb.id,
              locationId: defaultLocation.id,
              movementType: 'SALE',
              quantity: -bulbQty,
              unitCost: prodLedBulb.cost,
              referenceType: 'SALE',
              referenceId: inv3.id,
              referenceNumber: inv3.invoiceNumber,
              notes: 'Outward sale against INV-DEMO-003 [DEMO_DATA]',
              createdBy: userId || 'SYSTEM',
            },
            {
              companyId,
              productId: prodDal.id,
              locationId: defaultLocation.id,
              movementType: 'SALE',
              quantity: -dalQty,
              unitCost: prodDal.cost,
              referenceType: 'SALE',
              referenceId: inv3.id,
              referenceNumber: inv3.invoiceNumber,
              notes: 'Outward sale against INV-DEMO-003 [DEMO_DATA]',
              createdBy: userId || 'SYSTEM',
            },
          ],
        });
        movementsCreated += 4;

        await tx.stockBalance.update({
          where: { companyId_productId_locationId: { companyId, productId: prodButter.id, locationId: defaultLocation.id } },
          data: { quantity: { decrement: butterQty } },
        });
        await tx.product.update({ where: { id: prodButter.id }, data: { currentStock: { decrement: butterQty } } });

        await tx.stockBalance.update({
          where: { companyId_productId_locationId: { companyId, productId: prodMaggi.id, locationId: defaultLocation.id } },
          data: { quantity: { decrement: maggiQty } },
        });
        await tx.product.update({ where: { id: prodMaggi.id }, data: { currentStock: { decrement: maggiQty } } });

        await tx.stockBalance.update({
          where: { companyId_productId_locationId: { companyId, productId: prodLedBulb.id, locationId: defaultLocation.id } },
          data: { quantity: { decrement: bulbQty } },
        });
        await tx.product.update({ where: { id: prodLedBulb.id }, data: { currentStock: { decrement: bulbQty } } });

        await tx.stockBalance.update({
          where: { companyId_productId_locationId: { companyId, productId: prodDal.id, locationId: defaultLocation.id } },
          data: { quantity: { decrement: dalQty } },
        });
        await tx.product.update({ where: { id: prodDal.id }, data: { currentStock: { decrement: dalQty } } });

        // Update Customer Khata balance
        const runningCust1 = (cust1.currentBalance || 2500) + grandTotal3;
        await tx.customerLedger.create({
          data: {
            companyId,
            customerId: cust1.id,
            entryDate: inv3.invoiceDate,
            transactionType: 'SALE',
            referenceType: 'INVOICE',
            referenceId: inv3.id,
            referenceNumber: inv3.invoiceNumber,
            debitAmount: grandTotal3,
            creditAmount: 0,
            runningBalance: runningCust1,
            description: `Khata Credit Sale #${inv3.invoiceNumber} [DEMO_DATA]`,
            createdBy: userId || 'SYSTEM',
          },
        });
        await tx.customer.update({
          where: { id: cust1.id },
          data: { currentBalance: runningCust1 },
        });
        cust1.currentBalance = runningCust1;
      }

      // Invoice 4: INV-DEMO-004 (Interstate B2B Tax Invoice with IGST)
      let inv4 = await tx.salesInvoice.findFirst({
        where: { companyId, invoiceNumber: 'INV-DEMO-004' },
      });
      if (!inv4 && cust4) {
        const spkQty = 2;
        const spkRate = 849;
        const spkTaxable = spkQty * spkRate; // 1698
        const spkIgst = spkTaxable * 0.18; // 305.64
        const spkLineTotal = spkTaxable + spkIgst; // 2003.64

        const sprQty = 2;
        const sprRate = 175;
        const sprTaxable = sprQty * sprRate; // 350
        const sprIgst = sprTaxable * 0.12; // 42.00
        const sprLineTotal = sprTaxable + sprIgst; // 392.00

        const subtotal4 = spkTaxable + sprTaxable; // 2048.00
        const igst4 = spkIgst + sprIgst; // 347.64
        const grandTotal4 = 2396.00;
        const roundOff4 = 0.36;
        const amountPaid4 = 1396.00;

        inv4 = await tx.salesInvoice.create({
          data: {
            companyId,
            customerId: cust4.id,
            invoiceNumber: 'INV-DEMO-004',
            invoiceType: 'TAX_INVOICE',
            invoiceDate: new Date(Date.now() - 1 * 86400000),
            dueDate: new Date(Date.now() + 14 * 86400000),
            locationId: defaultLocation.id,
            status: 'POSTED',
            customerNameSnapshot: cust4.name,
            customerPhoneSnapshot: cust4.phone,
            customerAddressSnapshot: `${cust4.addressLine1}, ${cust4.city}, ${cust4.state}`,
            customerGstinSnapshot: cust4.gstin,
            subtotal: subtotal4,
            taxableAmount: subtotal4,
            cgstAmount: 0,
            sgstAmount: 0,
            igstAmount: igst4,
            roundOff: roundOff4,
            grandTotal: grandTotal4,
            amountPaid: amountPaid4,
            amountReturned: 0,
            paymentStatus: 'PARTIALLY_PAID',
            notes: 'Interstate B2B tax invoice with IGST [DEMO_DATA]',
            createdBy: userId || 'SYSTEM',
            postedBy: userId || 'SYSTEM',
            postedAt: new Date(Date.now() - 1 * 86400000),
            items: {
              create: [
                {
                  companyId,
                  productId: prodSpeaker.id,
                  productNameSnapshot: prodSpeaker.name,
                  skuSnapshot: prodSpeaker.sku,
                  barcodeSnapshot: prodSpeaker.barcode,
                  unitNameSnapshot: prodSpeaker.unitCode,
                  hsnCodeSnapshot: prodSpeaker.hsnCode,
                  quantity: spkQty,
                  sellingRate: spkRate,
                  taxableAmount: spkTaxable,
                  taxRate: 18.0,
                  cgstRate: 0,
                  sgstRate: 0,
                  igstRate: 18.0,
                  igstAmount: spkIgst,
                  taxAmount: spkIgst,
                  lineTotal: spkLineTotal,
                  unitCostSnapshot: prodSpeaker.cost,
                },
                {
                  companyId,
                  productId: prodSpiral.id,
                  productNameSnapshot: prodSpiral.name,
                  skuSnapshot: prodSpiral.sku,
                  barcodeSnapshot: prodSpiral.barcode,
                  unitNameSnapshot: prodSpiral.unitCode,
                  hsnCodeSnapshot: prodSpiral.hsnCode,
                  quantity: sprQty,
                  sellingRate: sprRate,
                  taxableAmount: sprTaxable,
                  taxRate: 12.0,
                  cgstRate: 0,
                  sgstRate: 0,
                  igstRate: 12.0,
                  igstAmount: sprIgst,
                  taxAmount: sprIgst,
                  lineTotal: sprLineTotal,
                  unitCostSnapshot: prodSpiral.cost,
                },
              ],
            },
          },
        });
        salesCreated++;

        // Stock deductions
        await tx.stockMovement.createMany({
          data: [
            {
              companyId,
              productId: prodSpeaker.id,
              locationId: defaultLocation.id,
              movementType: 'SALE',
              quantity: -spkQty,
              unitCost: prodSpeaker.cost,
              referenceType: 'SALE',
              referenceId: inv4.id,
              referenceNumber: inv4.invoiceNumber,
              notes: 'Outward sale against INV-DEMO-004 [DEMO_DATA]',
              createdBy: userId || 'SYSTEM',
            },
            {
              companyId,
              productId: prodSpiral.id,
              locationId: defaultLocation.id,
              movementType: 'SALE',
              quantity: -sprQty,
              unitCost: prodSpiral.cost,
              referenceType: 'SALE',
              referenceId: inv4.id,
              referenceNumber: inv4.invoiceNumber,
              notes: 'Outward sale against INV-DEMO-004 [DEMO_DATA]',
              createdBy: userId || 'SYSTEM',
            },
          ],
        });
        movementsCreated += 2;

        await tx.stockBalance.update({
          where: { companyId_productId_locationId: { companyId, productId: prodSpeaker.id, locationId: defaultLocation.id } },
          data: { quantity: { decrement: spkQty } },
        });
        await tx.product.update({ where: { id: prodSpeaker.id }, data: { currentStock: { decrement: spkQty } } });

        await tx.stockBalance.update({
          where: { companyId_productId_locationId: { companyId, productId: prodSpiral.id, locationId: defaultLocation.id } },
          data: { quantity: { decrement: sprQty } },
        });
        await tx.product.update({ where: { id: prodSpiral.id }, data: { currentStock: { decrement: sprQty } } });

        // Partial payment record via Bank Transfer
        const pay3 = await tx.salesPayment.create({
          data: {
            companyId,
            customerId: cust4.id,
            salesInvoiceId: inv4.id,
            paymentNumber: 'SPAY-DEMO-003',
            paymentDate: inv4.invoiceDate,
            amount: amountPaid4,
            paymentMode: 'BANK_TRANSFER',
            referenceNo: 'NEFT/HDFC/2026091801',
            status: 'POSTED',
            notes: 'Advance part payment received via NEFT [DEMO_DATA]',
            createdBy: userId || 'SYSTEM',
          },
        });
        salesPaymentsCreated++;

        // Ledger entries
        const runningCust4AfterSale = (cust4.currentBalance || 0) + grandTotal4;
        await tx.customerLedger.create({
          data: {
            companyId,
            customerId: cust4.id,
            entryDate: inv4.invoiceDate,
            transactionType: 'SALE',
            referenceType: 'INVOICE',
            referenceId: inv4.id,
            referenceNumber: inv4.invoiceNumber,
            debitAmount: grandTotal4,
            creditAmount: 0,
            runningBalance: runningCust4AfterSale,
            description: `Interstate Tax Invoice #${inv4.invoiceNumber} [DEMO_DATA]`,
            createdBy: userId || 'SYSTEM',
          },
        });

        const runningCust4AfterPay = runningCust4AfterSale - amountPaid4;
        await tx.customerLedger.create({
          data: {
            companyId,
            customerId: cust4.id,
            entryDate: inv4.invoiceDate,
            transactionType: 'PAYMENT',
            referenceType: 'PAYMENT',
            referenceId: pay3.id,
            referenceNumber: pay3.paymentNumber,
            debitAmount: 0,
            creditAmount: amountPaid4,
            runningBalance: runningCust4AfterPay,
            description: `Part-payment via NEFT #${pay3.paymentNumber} [DEMO_DATA]`,
            createdBy: userId || 'SYSTEM',
          },
        });

        await tx.customer.update({
          where: { id: cust4.id },
          data: { currentBalance: runningCust4AfterPay },
        });
        cust4.currentBalance = runningCust4AfterPay;
      }

      // Invoice 5: INV-DEMO-005 (Discounted Retail Sale paid via Card)
      let inv5 = await tx.salesInvoice.findFirst({
        where: { companyId, invoiceNumber: 'INV-DEMO-005' },
      });
      if (!inv5 && cust5) {
        const silkQty = 2;
        const silkRate = 165;
        const silkTaxable = silkQty * silkRate; // 330
        const silkCgst = silkTaxable * 0.09; // 29.70
        const silkSgst = silkTaxable * 0.09; // 29.70
        const silkLineTotal = silkTaxable + silkCgst + silkSgst; // 389.40

        const packQty = 1;
        const packRate = 360;
        const packTaxable = packQty * packRate; // 360
        const packCgst = packTaxable * 0.06; // 21.60
        const packSgst = packTaxable * 0.06; // 21.60
        const packLineTotal = packTaxable + packCgst + packSgst; // 403.20

        const subtotal5 = silkTaxable + packTaxable; // 690.00
        const discount5 = 50.00;
        const taxable5 = subtotal5 - discount5; // 640.00
        const cgst5 = 47.58;
        const sgst5 = 47.58;
        const grandTotal5 = 735.00;
        const roundOff5 = -0.16;

        inv5 = await tx.salesInvoice.create({
          data: {
            companyId,
            customerId: cust5.id,
            invoiceNumber: 'INV-DEMO-005',
            invoiceType: 'RETAIL',
            invoiceDate: new Date(),
            locationId: defaultLocation.id,
            status: 'POSTED',
            customerNameSnapshot: cust5.name,
            customerPhoneSnapshot: cust5.phone,
            customerAddressSnapshot: `${cust5.addressLine1}, ${cust5.city}`,
            subtotal: subtotal5,
            invoiceDiscount: discount5,
            taxableAmount: taxable5,
            cgstAmount: cgst5,
            sgstAmount: sgst5,
            roundOff: roundOff5,
            grandTotal: grandTotal5,
            amountPaid: grandTotal5,
            amountReturned: 0,
            paymentStatus: 'PAID',
            notes: 'Loyal customer special discount sale paid via debit card [DEMO_DATA]',
            createdBy: userId || 'SYSTEM',
            postedBy: userId || 'SYSTEM',
            postedAt: new Date(),
            items: {
              create: [
                {
                  companyId,
                  productId: prodSilk.id,
                  productNameSnapshot: prodSilk.name,
                  skuSnapshot: prodSilk.sku,
                  barcodeSnapshot: prodSilk.barcode,
                  unitNameSnapshot: prodSilk.unitCode,
                  hsnCodeSnapshot: prodSilk.hsnCode,
                  quantity: silkQty,
                  sellingRate: silkRate,
                  taxableAmount: silkTaxable,
                  taxRate: 18.0,
                  cgstRate: 9.0,
                  sgstRate: 9.0,
                  cgstAmount: silkCgst,
                  sgstAmount: silkSgst,
                  taxAmount: silkCgst + silkSgst,
                  lineTotal: silkLineTotal,
                  unitCostSnapshot: prodSilk.cost,
                },
                {
                  companyId,
                  productId: prodPack6.id,
                  productNameSnapshot: prodPack6.name,
                  skuSnapshot: prodPack6.sku,
                  barcodeSnapshot: prodPack6.barcode,
                  unitNameSnapshot: prodPack6.unitCode,
                  hsnCodeSnapshot: prodPack6.hsnCode,
                  quantity: packQty,
                  sellingRate: packRate,
                  taxableAmount: packTaxable,
                  taxRate: 12.0,
                  cgstRate: 6.0,
                  sgstRate: 6.0,
                  cgstAmount: packCgst,
                  sgstAmount: packSgst,
                  taxAmount: packCgst + packSgst,
                  lineTotal: packLineTotal,
                  unitCostSnapshot: prodPack6.cost,
                },
              ],
            },
          },
        });
        salesCreated++;

        // Stock deductions
        await tx.stockMovement.createMany({
          data: [
            {
              companyId,
              productId: prodSilk.id,
              locationId: defaultLocation.id,
              movementType: 'SALE',
              quantity: -silkQty,
              unitCost: prodSilk.cost,
              referenceType: 'SALE',
              referenceId: inv5.id,
              referenceNumber: inv5.invoiceNumber,
              notes: 'Outward sale against INV-DEMO-005 [DEMO_DATA]',
              createdBy: userId || 'SYSTEM',
            },
            {
              companyId,
              productId: prodPack6.id,
              locationId: defaultLocation.id,
              movementType: 'SALE',
              quantity: -packQty,
              unitCost: prodPack6.cost,
              referenceType: 'SALE',
              referenceId: inv5.id,
              referenceNumber: inv5.invoiceNumber,
              notes: 'Outward sale against INV-DEMO-005 [DEMO_DATA]',
              createdBy: userId || 'SYSTEM',
            },
          ],
        });
        movementsCreated += 2;

        await tx.stockBalance.update({
          where: { companyId_productId_locationId: { companyId, productId: prodSilk.id, locationId: defaultLocation.id } },
          data: { quantity: { decrement: silkQty } },
        });
        await tx.product.update({ where: { id: prodSilk.id }, data: { currentStock: { decrement: silkQty } } });

        await tx.stockBalance.update({
          where: { companyId_productId_locationId: { companyId, productId: prodPack6.id, locationId: defaultLocation.id } },
          data: { quantity: { decrement: packQty } },
        });
        await tx.product.update({ where: { id: prodPack6.id }, data: { currentStock: { decrement: packQty } } });

        // Payment record via Card
        await tx.salesPayment.create({
          data: {
            companyId,
            customerId: cust5.id,
            salesInvoiceId: inv5.id,
            paymentNumber: 'SPAY-DEMO-004',
            paymentDate: inv5.invoiceDate,
            amount: grandTotal5,
            paymentMode: 'CARD',
            referenceNo: 'POS-TXN-491028',
            status: 'POSTED',
            notes: 'Debit card POS swipe authorization [DEMO_DATA]',
            createdBy: userId || 'SYSTEM',
          },
        });
        salesPaymentsCreated++;
      }

      // Invoice 6: INV-DEMO-006 (Held POS Draft Invoice)
      let inv6 = await tx.salesInvoice.findFirst({
        where: { companyId, invoiceNumber: 'INV-DEMO-006' },
      });
      if (!inv6 && cust2) {
        inv6 = await tx.salesInvoice.create({
          data: {
            companyId,
            customerId: cust2.id,
            invoiceNumber: 'INV-DEMO-006',
            invoiceType: 'RETAIL',
            invoiceDate: new Date(),
            locationId: defaultLocation.id,
            status: 'DRAFT',
            customerNameSnapshot: cust2.name,
            customerPhoneSnapshot: cust2.phone,
            subtotal: 385.00,
            taxableAmount: 385.00,
            cgstAmount: 17.43,
            sgstAmount: 17.43,
            roundOff: -0.11,
            grandTotal: 419.00,
            amountPaid: 0.0,
            amountReturned: 0,
            paymentStatus: 'UNPAID',
            notes: 'Held cart invoice awaiting customer checkout [DEMO_DATA]',
            createdBy: userId || 'SYSTEM',
            items: {
              create: [
                {
                  companyId,
                  productId: prodTea.id,
                  productNameSnapshot: prodTea.name,
                  skuSnapshot: prodTea.sku,
                  barcodeSnapshot: prodTea.barcode,
                  unitNameSnapshot: prodTea.unitCode,
                  quantity: 1,
                  sellingRate: 265,
                  taxableAmount: 265,
                  taxRate: 5.0,
                  cgstRate: 2.5,
                  sgstRate: 2.5,
                  cgstAmount: 6.63,
                  sgstAmount: 6.63,
                  taxAmount: 13.25,
                  lineTotal: 278.25,
                  unitCostSnapshot: prodTea.cost,
                },
                {
                  companyId,
                  productId: prodRedBull.id,
                  productNameSnapshot: prodRedBull.name,
                  skuSnapshot: prodRedBull.sku,
                  barcodeSnapshot: prodRedBull.barcode,
                  unitNameSnapshot: prodRedBull.unitCode,
                  quantity: 1,
                  sellingRate: 120,
                  taxableAmount: 120,
                  taxRate: 18.0,
                  cgstRate: 9.0,
                  sgstRate: 9.0,
                  cgstAmount: 10.80,
                  sgstAmount: 10.80,
                  taxAmount: 21.60,
                  lineTotal: 141.60,
                  unitCostSnapshot: prodRedBull.cost,
                },
              ],
            },
          },
        });
        salesCreated++;
      }

      // 15. Customer Khata Account Settlements
      // SPAY-DEMO-005: Ramesh Sharma pays 1500 towards Khata balance
      let pay5 = await tx.salesPayment.findFirst({
        where: { companyId, paymentNumber: 'SPAY-DEMO-005' },
      });
      if (!pay5 && cust1) {
        pay5 = await tx.salesPayment.create({
          data: {
            companyId,
            customerId: cust1.id,
            paymentNumber: 'SPAY-DEMO-005',
            paymentDate: new Date(),
            amount: 1500.00,
            paymentMode: 'UPI',
            referenceNo: 'UPI/PHONEPE/9920199201',
            status: 'POSTED',
            notes: 'Customer Khata account payment via PhonePe [DEMO_DATA]',
            createdBy: userId || 'SYSTEM',
          },
        });
        salesPaymentsCreated++;

        const runningCust1Final = (cust1.currentBalance || 4012) - 1500.00;
        await tx.customerLedger.create({
          data: {
            companyId,
            customerId: cust1.id,
            entryDate: pay5.paymentDate,
            transactionType: 'PAYMENT',
            referenceType: 'PAYMENT',
            referenceId: pay5.id,
            referenceNumber: pay5.paymentNumber,
            debitAmount: 0,
            creditAmount: 1500.00,
            runningBalance: runningCust1Final,
            description: `Khata Payment received via UPI (#SPAY-DEMO-005) [DEMO_DATA]`,
            createdBy: userId || 'SYSTEM',
          },
        });
        await tx.customer.update({
          where: { id: cust1.id },
          data: { currentBalance: runningCust1Final },
        });
        cust1.currentBalance = runningCust1Final;
      }

      // SPAY-DEMO-006: Anita Desai settles her full 650 opening balance in Cash
      let pay6 = await tx.salesPayment.findFirst({
        where: { companyId, paymentNumber: 'SPAY-DEMO-006' },
      });
      if (!pay6 && cust5) {
        pay6 = await tx.salesPayment.create({
          data: {
            companyId,
            customerId: cust5.id,
            paymentNumber: 'SPAY-DEMO-006',
            paymentDate: new Date(),
            amount: 650.00,
            paymentMode: 'CASH',
            status: 'POSTED',
            notes: 'Cleared full previous opening balance [DEMO_DATA]',
            createdBy: userId || 'SYSTEM',
          },
        });
        salesPaymentsCreated++;

        const runningCust5Final = (cust5.currentBalance || 650) - 650.00;
        await tx.customerLedger.create({
          data: {
            companyId,
            customerId: cust5.id,
            entryDate: pay6.paymentDate,
            transactionType: 'PAYMENT',
            referenceType: 'PAYMENT',
            referenceId: pay6.id,
            referenceNumber: pay6.paymentNumber,
            debitAmount: 0,
            creditAmount: 650.00,
            runningBalance: runningCust5Final,
            description: `Payment received in Cash (#SPAY-DEMO-006) [DEMO_DATA]`,
            createdBy: userId || 'SYSTEM',
          },
        });
        await tx.customer.update({
          where: { id: cust5.id },
          data: { currentBalance: runningCust5Final },
        });
        cust5.currentBalance = runningCust5Final;
      }

      // 16. Demo Sales Return: SR-DEMO-001 (Resellable Return against INV-DEMO-002)
      let sr1 = await tx.salesReturn.findFirst({
        where: { companyId, returnNumber: 'SR-DEMO-001' },
      });
      if (!sr1 && inv2 && cust2) {
        const retQty = 1;
        const retRate = 120.00;
        const retTaxable = 120.00;
        const retCgst = 10.80;
        const retSgst = 10.80;
        const retTotal = 141.60;

        const origItem = inv2.items?.find((it: any) => it.productId === prodRedBull.id);

        sr1 = await tx.salesReturn.create({
          data: {
            companyId,
            customerId: cust2.id,
            originalSalesInvoiceId: inv2.id,
            returnNumber: 'SR-DEMO-001',
            returnDate: new Date(),
            locationId: defaultLocation.id,
            status: 'POSTED',
            subtotal: retTaxable,
            taxableAmount: retTaxable,
            cgstAmount: retCgst,
            sgstAmount: retSgst,
            grandTotal: retTotal,
            refundAmount: retTotal,
            creditAmount: 0,
            reason: 'Customer bought extra can by mistake [DEMO_DATA]',
            notes: 'Returned 1 unit of Red Bull in unopened condition [DEMO_DATA]',
            createdBy: userId || 'SYSTEM',
            approvedBy: userId || 'SYSTEM',
            postedBy: userId || 'SYSTEM',
            postedAt: new Date(),
            items: {
              create: [
                {
                  companyId,
                  originalSalesInvoiceItemId: origItem?.id || null,
                  productId: prodRedBull.id,
                  productNameSnapshot: prodRedBull.name,
                  quantity: retQty,
                  returnRate: retRate,
                  taxRate: 18.0,
                  taxAmount: retCgst + retSgst,
                  lineTotal: retTotal,
                  restockCondition: 'RESELLABLE',
                  reason: 'Unopened can returned [DEMO_DATA]',
                },
              ],
            },
          },
        });
        salesReturnsCreated++;

        // Restock Red Bull stock movement (positive qty for SALES_RETURN)
        await tx.stockMovement.create({
          data: {
            companyId,
            productId: prodRedBull.id,
            locationId: defaultLocation.id,
            movementType: 'SALES_RETURN',
            quantity: retQty,
            unitCost: prodRedBull.cost,
            referenceType: 'SALES_RETURN',
            referenceId: sr1.id,
            referenceNumber: sr1.returnNumber,
            notes: 'Restocked 1 unit of Red Bull in resellable condition [DEMO_DATA]',
            createdBy: userId || 'SYSTEM',
          },
        });
        movementsCreated++;

        await tx.stockBalance.update({
          where: { companyId_productId_locationId: { companyId, productId: prodRedBull.id, locationId: defaultLocation.id } },
          data: { quantity: { increment: retQty } },
        });
        await tx.product.update({
          where: { id: prodRedBull.id },
          data: { currentStock: { increment: retQty } },
        });

        // Update sales invoice amountReturned
        await tx.salesInvoice.update({
          where: { id: inv2.id },
          data: { amountReturned: { increment: retTotal } },
        });
      }

      // 17. Audit Log
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
            customersCreated,
            salesCreated,
            salesPaymentsCreated,
            salesReturnsCreated,
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
        customersCreated,
        salesCreated,
        salesPaymentsCreated,
        salesReturnsCreated,
        message: `Successfully installed demo data with ${productsCreated} products, ${suppliersCreated} suppliers, ${purchasesCreated} purchase invoices, ${customersCreated} customers, ${salesCreated} sales invoices, and inventory records.`,
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

      // Find all demo customers
      const demoCustomers = await tx.customer.findMany({
        where: {
          companyId,
          OR: [
            { customerCode: { startsWith: 'CUST-DEMO-' } },
            { notes: { contains: '[DEMO_DATA]' } },
          ],
        },
        select: { id: true },
      });
      const demoCustomerIds = demoCustomers.map((c) => c.id);

      // Find all demo sales invoices
      const demoSalesInvoices = await tx.salesInvoice.findMany({
        where: {
          companyId,
          OR: [
            { invoiceNumber: { startsWith: 'INV-DEMO-' } },
            { notes: { contains: '[DEMO_DATA]' } },
            ...(demoCustomerIds.length > 0 ? [{ customerId: { in: demoCustomerIds } }] : []),
          ],
        },
        select: { id: true },
      });
      const demoInvoiceIds = demoSalesInvoices.map((i) => i.id);

      // Find all demo sales returns
      const demoSalesReturns = await tx.salesReturn.findMany({
        where: {
          companyId,
          OR: [
            { returnNumber: { startsWith: 'SR-DEMO-' } },
            { notes: { contains: '[DEMO_DATA]' } },
            ...(demoInvoiceIds.length > 0 ? [{ originalSalesInvoiceId: { in: demoInvoiceIds } }] : []),
          ],
        },
        select: { id: true },
      });
      const demoSalesReturnIds = demoSalesReturns.map((r) => r.id);

      // 1. Delete Demo Sales Return Items & Sales Returns
      let salesReturnsDeleted = 0;
      if (demoSalesReturnIds.length > 0) {
        await tx.salesReturnItem.deleteMany({
          where: { salesReturnId: { in: demoSalesReturnIds } },
        });
        const srRes = await tx.salesReturn.deleteMany({
          where: { id: { in: demoSalesReturnIds } },
        });
        salesReturnsDeleted = srRes.count;
      }
      if (demoProductIds.length > 0) {
        await tx.salesReturnItem.deleteMany({
          where: { productId: { in: demoProductIds } },
        });
      }

      // 2. Delete Demo Sales Payments
      const spRes = await tx.salesPayment.deleteMany({
        where: {
          companyId,
          OR: [
            { paymentNumber: { startsWith: 'SPAY-DEMO-' } },
            { notes: { contains: '[DEMO_DATA]' } },
            ...(demoCustomerIds.length > 0 ? [{ customerId: { in: demoCustomerIds } }] : []),
            ...(demoInvoiceIds.length > 0 ? [{ salesInvoiceId: { in: demoInvoiceIds } }] : []),
          ],
        },
      });
      const salesPaymentsDeleted = spRes.count;

      // 3. Delete Demo Sales Invoice Items & Sales Invoices
      let salesDeleted = 0;
      if (demoInvoiceIds.length > 0) {
        await tx.salesInvoiceItem.deleteMany({
          where: { salesInvoiceId: { in: demoInvoiceIds } },
        });
        const invRes = await tx.salesInvoice.deleteMany({
          where: { id: { in: demoInvoiceIds } },
        });
        salesDeleted = invRes.count;
      }
      if (demoProductIds.length > 0) {
        await tx.salesInvoiceItem.deleteMany({
          where: { productId: { in: demoProductIds } },
        });
      }

      // 4. Delete Demo Customer Ledger Entries & Customers
      await tx.customerLedger.deleteMany({
        where: {
          companyId,
          OR: [
            ...(demoCustomerIds.length > 0 ? [{ customerId: { in: demoCustomerIds } }] : []),
            { description: { contains: '[DEMO_DATA]' } },
            { notes: { contains: '[DEMO_DATA]' } },
          ],
        },
      });

      let customersDeleted = 0;
      if (demoCustomerIds.length > 0) {
        const custRes = await tx.customer.deleteMany({
          where: { id: { in: demoCustomerIds } },
        });
        customersDeleted = custRes.count;
      }
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
            customersDeleted,
            salesDeleted,
            salesPaymentsDeleted,
            salesReturnsDeleted,
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
        customersDeleted,
        salesDeleted,
        salesPaymentsDeleted,
        salesReturnsDeleted,
        message: `Successfully cleared demo data (${productsDeleted} products, ${suppliersDeleted} suppliers, ${purchasesDeleted} purchases, ${customersDeleted} customers, ${salesDeleted} sales removed).`,
      };
    });
  }
}
