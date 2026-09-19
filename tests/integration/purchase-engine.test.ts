import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CategoryService } from '../../packages/business/src/services/category.service';
import { CompanyService } from '../../packages/business/src/services/company.service';
import { LocationService } from '../../packages/business/src/services/location.service';
import { ProductService } from '../../packages/business/src/services/product.service';
import { PurchasePaymentService } from '../../packages/business/src/services/purchase-payment.service';
import { PurchaseReturnService } from '../../packages/business/src/services/purchase-return.service';
import { PurchaseService } from '../../packages/business/src/services/purchase.service';
import { StockService } from '../../packages/business/src/services/stock.service';
import { SupplierLedgerService } from '../../packages/business/src/services/supplier-ledger.service';
import { SupplierService } from '../../packages/business/src/services/supplier.service';
import { UnitService } from '../../packages/business/src/services/unit.service';
import { createTestDatabase } from '../helpers/test-db';

describe('Purchase Management, Suppliers & Purchase Returns Engine Integration Tests', () => {
  let cleanupFn: () => Promise<void>;
  let prisma: any;
  let companyService: CompanyService;
  let productService: ProductService;
  let locationService: LocationService;
  let stockService: StockService;
  let supplierService: SupplierService;
  let supplierLedgerService: SupplierLedgerService;
  let purchaseService: PurchaseService;
  let purchasePaymentService: PurchasePaymentService;
  let purchaseReturnService: PurchaseReturnService;
  let unitService: UnitService;

  let company1Id: string;
  let user1Id: string;
  let company2Id: string;
  let user2Id: string;

  let defaultLocation1Id: string;
  let pcsUnit1Id: string;
  let testProduct1Id: string;
  let testProduct2Id: string;

  beforeAll(async () => {
    const { dbService, cleanup } = await createTestDatabase();
    cleanupFn = cleanup;
    prisma = dbService.getClient();

    companyService = new CompanyService(prisma);
    productService = new ProductService(prisma);
    locationService = new LocationService(prisma);
    stockService = new StockService(prisma);
    supplierService = new SupplierService(prisma);
    supplierLedgerService = new SupplierLedgerService(prisma);
    purchaseService = new PurchaseService(prisma);
    purchasePaymentService = new PurchasePaymentService(prisma);
    purchaseReturnService = new PurchaseReturnService(prisma);
    unitService = new UnitService(prisma);
    const categoryService = new CategoryService(prisma);

    // Setup Company 1
    const setup1 = await companyService.setupCompanyAndAdmin({
      businessName: 'Apex Mart Mumbai',
      adminFullName: 'Apex Admin',
      adminUsername: 'apexadmin',
      adminPassword: 'Password123!',
      gstRegistered: true,
      gstin: '27AAAAA0000A1Z5',
      state: 'Maharashtra',
    });
    company1Id = setup1.company.id;
    user1Id = setup1.user.id;

    const loc1 = await locationService.getDefaultLocation(company1Id);
    defaultLocation1Id = loc1.id;

    // Seed units and category
    const units1 = await unitService.seedDefaultUnits(company1Id);
    const pcsUnit = units1.find((u) => u.shortCode === 'PCS') || units1[0];
    pcsUnit1Id = pcsUnit!.id;

    const cat1 = await categoryService.createCategory(
      company1Id,
      { name: 'Beverages' },
      user1Id,
    );

    // Create Test Products in Company 1
    const p1 = await productService.createProduct(
      company1Id,
      {
        name: 'Coca Cola 500ml',
        sku: 'CC-500',
        barcode: '8901234567890',
        categoryId: cat1.id,
        unitId: pcsUnit1Id,
        purchasePrice: 30,
        sellingPrice: 40,
        mrp: 45,
        taxRate: 18,
        trackStock: true,
        productType: 'PHYSICAL',
      },
      user1Id,
    );
    testProduct1Id = p1.id;

    const p2 = await productService.createProduct(
      company1Id,
      {
        name: 'Lays Classic Salted 50g',
        sku: 'LAYS-50',
        barcode: '8901234567891',
        categoryId: cat1.id,
        unitId: pcsUnit1Id,
        purchasePrice: 15,
        sellingPrice: 20,
        mrp: 20,
        taxRate: 12,
        trackStock: true,
        productType: 'PHYSICAL',
      },
      user1Id,
    );
    testProduct2Id = p2.id;

    // Setup Company 2 directly for multi-tenant isolation tests
    const comp2 = await prisma.company.create({
      data: {
        name: 'Zenith Retail Delhi',
        businessName: 'Zenith Retail Delhi',
        gstRegistered: true,
        gstin: '07BBBBB0000B1Z6',
        state: 'Delhi',
        isActive: true,
      },
    });
    company2Id = comp2.id;

    const u2 = await prisma.user.create({
      data: {
        companyId: company2Id,
        username: 'zenithadmin',
        passwordHash: 'dummy_hash',
        name: 'Zenith Admin',
        isActive: true,
      },
    });
    user2Id = u2.id;
  });

  afterAll(async () => {
    if (cleanupFn) await cleanupFn();
  });

  describe('1. Supplier Management & Opening Balance', () => {
    let createdSupplierId: string;

    it('should create a supplier with unique code and opening balance', async () => {
      const supplier = await supplierService.createSupplier(
        company1Id,
        {
          name: 'ABC Distributors',
          supplierCode: 'SUP-001',
          contactPerson: 'Rajesh Kumar',
          phone: '9876543210',
          email: 'abc@distributors.com',
          city: 'Mumbai',
          state: 'Maharashtra',
          gstin: '27ABCDE1234F1Z5',
          openingBalance: 5000,
          openingBalanceType: 'PAYABLE',
          creditLimit: 50000,
          creditPeriodDays: 30,
        },
        user1Id,
      );

      expect(supplier).toBeDefined();
      expect(supplier.name).toBe('ABC Distributors');
      expect(supplier.supplierCode).toBe('SUP-001');
      expect(supplier.currentBalance).toBe(5000); // Company owes supplier ₹5000
      createdSupplierId = supplier.id;

      // Verify opening balance ledger entry
      const ledger = await supplierLedgerService.getEntries(company1Id, {
        supplierId: supplier.id,
      });
      expect(ledger.items.length).toBe(1);
      expect(ledger.items[0]!.transactionType).toBe('OPENING_BALANCE');
      expect(ledger.items[0]!.creditAmount).toBe(5000);
      expect(ledger.items[0]!.runningBalance).toBe(5000);
    });

    it('should reject duplicate supplier code within the same company', async () => {
      await expect(
        supplierService.createSupplier(
          company1Id,
          {
            name: 'Another Vendor',
            supplierCode: 'SUP-001',
          },
          user1Id,
        ),
      ).rejects.toThrow();
    });

    it('should allow the same supplier code in a different company', async () => {
      const comp2Supplier = await supplierService.createSupplier(
        company2Id,
        {
          name: 'Delhi Wholesale Supplies',
          supplierCode: 'SUP-001', // Same code in company 2
        },
        user2Id,
      );

      expect(comp2Supplier).toBeDefined();
      expect(comp2Supplier.companyId).toBe(company2Id);
      expect(comp2Supplier.supplierCode).toBe('SUP-001');
    });

    it('should update supplier details and toggle active state', async () => {
      const updated = await supplierService.updateSupplier(
        company1Id,
        createdSupplierId,
        {
          contactPerson: 'Rajesh Sharma',
        },
        user1Id,
      );
      expect(updated.contactPerson).toBe('Rajesh Sharma');

      const toggled = await supplierService.toggleSupplierActive(
        company1Id,
        createdSupplierId,
        user1Id,
      );
      expect(toggled.isActive).toBe(false);

      const reactivated = await supplierService.toggleSupplierActive(
        company1Id,
        createdSupplierId,
        user1Id,
      );
      expect(reactivated.isActive).toBe(true);
    });
  });

  describe('2. Purchase Drafts & Calculations', () => {
    let supplierId: string;
    let purchaseDraftId: string;

    beforeAll(async () => {
      const s = await supplierService.createSupplier(
        company1Id,
        {
          name: 'Coca Cola Beverages Maharashtra',
          supplierCode: 'SUP-BEV-01',
          state: 'Maharashtra',
        },
        user1Id,
      );
      supplierId = s.id;
    });

    it('should create a purchase draft and accurately calculate intra-state GST without altering stock or balance', async () => {
      const initialStock = await stockService.getProductStockSummary(company1Id, testProduct1Id);
      expect(initialStock.currentStock).toBe(0);

      const draft = await purchaseService.createDraft(
        company1Id,
        {
          supplierId,
          supplierInvoiceNumber: 'INV-BEV-999',
          locationId: defaultLocation1Id,
          items: [
            {
              productId: testProduct1Id, // Coca Cola 500ml @ ₹30, 18% GST (Intra-state CGST 9% + SGST 9%)
              quantity: 100,
              purchaseRate: 30, // 3000
              taxRate: 18, // tax = 540 (CGST 270, SGST 270)
            },
          ],
        },
        user1Id,
      );

      expect(draft).toBeDefined();
      expect(draft.status).toBe('DRAFT');
      expect(draft.subtotal).toBe(3000);
      expect(draft.taxableAmount).toBe(3000);
      expect(draft.cgstAmount).toBe(270);
      expect(draft.sgstAmount).toBe(270);
      expect(draft.igstAmount).toBe(0);
      expect(draft.grandTotal).toBe(3540);
      expect(draft.amountPaid).toBe(0);
      expect(draft.paymentStatus).toBe('UNPAID');
      purchaseDraftId = draft.id;

      // Ensure Stock is still 0 (Draft does not affect stock)
      const postDraftStock = await stockService.getProductStockSummary(
        company1Id,
        testProduct1Id,
      );
      expect(postDraftStock.currentStock).toBe(0);

      // Ensure Supplier balance is still 0 (Draft does not affect ledger)
      const supplier = await supplierService.getSupplierById(company1Id, supplierId);
      expect(supplier?.currentBalance).toBe(0);
    });

    it('should edit purchase draft lines and recalculate totals', async () => {
      const updated = await purchaseService.updateDraft(
        company1Id,
        purchaseDraftId,
        {
          items: [
            {
              productId: testProduct1Id, // 100 * 30 = 3000 (tax 540)
              quantity: 100,
              purchaseRate: 30,
              taxRate: 18,
            },
            {
              productId: testProduct2Id, // Lays: 50 * 15 = 750 (tax 12% = 90)
              quantity: 50,
              purchaseRate: 15,
              taxRate: 12,
            },
          ],
        },
        user1Id,
      );

      expect(updated.subtotal).toBe(3750);
      expect(updated.grandTotal).toBe(4380); // 3750 + 540 + 90 = 4380
    });
  });

  describe('3. Atomic Purchase Posting & Stock Engine Receipts', () => {
    let supplierId: string;
    let purchaseId: string;

    beforeAll(async () => {
      const s = await supplierService.createSupplier(
        company1Id,
        {
          name: 'Global Beverages Supply',
          supplierCode: 'SUP-GLB-01',
          state: 'Maharashtra',
        },
        user1Id,
      );
      supplierId = s.id;
    });

    it('should post purchase, update authoritative stock ledger, and increase supplier payable', async () => {
      // 1. Create Draft
      const draft = await purchaseService.createDraft(
        company1Id,
        {
          supplierId,
          supplierInvoiceNumber: 'INV-2026-001',
          locationId: defaultLocation1Id,
          items: [
            {
              productId: testProduct1Id,
              quantity: 100,
              purchaseRate: 30,
              taxRate: 18,
            },
          ],
        },
        user1Id,
      );

      // 2. Post Purchase
      const posted = await purchaseService.postPurchase(company1Id, draft.id, user1Id);
      expect(posted.status).toBe('POSTED');
      expect(posted.postedBy).toBe(user1Id);
      expect(posted.grandTotal).toBe(3540);
      purchaseId = posted.id;

      // 3. Verify Stock increased by 100 units
      const stockSummary = await stockService.getProductStockSummary(company1Id, testProduct1Id);
      expect(stockSummary.currentStock).toBe(100);

      // Verify Stock Movement record
      const movements = await stockService.getStockMovements(company1Id, {
        productId: testProduct1Id,
      });
      const receiptMovement = movements.items.find((m) => m.referenceId === posted.id);
      expect(receiptMovement).toBeDefined();
      expect(receiptMovement?.movementType).toBe('PURCHASE_RECEIPT');
      expect(receiptMovement?.quantity).toBe(100);
      expect(receiptMovement?.unitCost).toBe(30);

      // 4. Verify Supplier balance increased to ₹3,540
      const supplier = await supplierService.getSupplierById(company1Id, supplierId);
      expect(supplier?.currentBalance).toBe(3540);

      // 5. Verify Supplier Ledger entry
      const ledger = await supplierLedgerService.getEntries(company1Id, { supplierId });
      const purchaseEntry = ledger.items.find((e) => e.referenceId === posted.id);
      expect(purchaseEntry).toBeDefined();
      expect(purchaseEntry?.transactionType).toBe('PURCHASE');
      expect(purchaseEntry?.creditAmount).toBe(3540);
      expect(purchaseEntry?.runningBalance).toBe(3540);
    });

    it('should reject double posting of the same purchase', async () => {
      await expect(
        purchaseService.postPurchase(company1Id, purchaseId, user1Id),
      ).rejects.toThrow(/already been posted/i);

      // Ensure stock did not double
      const stockSummary = await stockService.getProductStockSummary(company1Id, testProduct1Id);
      expect(stockSummary.currentStock).toBe(100);
    });
  });

  describe('4. Supplier Payments & Partial Settlements', () => {
    let supplierId: string;
    let purchaseId: string;
    let firstPaymentId: string;

    beforeAll(async () => {
      const s = await supplierService.createSupplier(
        company1Id,
        {
          name: 'Prime Goods Logistics',
          supplierCode: 'SUP-PRM-01',
          state: 'Maharashtra',
        },
        user1Id,
      );
      supplierId = s.id;

      const draft = await purchaseService.createDraft(
        company1Id,
        {
          supplierId,
          supplierInvoiceNumber: 'INV-PRM-500',
          locationId: defaultLocation1Id,
          items: [
            {
              productId: testProduct1Id,
              quantity: 50,
              purchaseRate: 30, // 1500
              taxRate: 18, // 270 -> grand total 1770
            },
          ],
        },
        user1Id,
      );

      const posted = await purchaseService.postPurchase(company1Id, draft.id, user1Id);
      purchaseId = posted.id;
    });

    it('should record partial payment and update payment status to PARTIALLY_PAID', async () => {
      // Total is ₹1,770. Pay ₹770 first.
      const payment1 = await purchasePaymentService.createPayment(
        company1Id,
        {
          supplierId,
          purchaseId,
          amount: 770,
          paymentMode: 'UPI',
          referenceNo: 'UPI-TXN-123456',
        },
        user1Id,
      );

      expect(payment1).toBeDefined();
      expect(payment1.amount).toBe(770);
      expect(payment1.status).toBe('POSTED');
      firstPaymentId = payment1.id;

      // Verify purchase updated
      const purchase = await purchaseService.getPurchaseById(company1Id, purchaseId);
      expect(purchase?.amountPaid).toBe(770);
      expect(purchase?.paymentStatus).toBe('PARTIALLY_PAID');

      // Verify supplier balance reduced: 1770 - 770 = 1000
      const supplier = await supplierService.getSupplierById(company1Id, supplierId);
      expect(supplier?.currentBalance).toBe(1000);
    });

    it('should record remaining payment and transition status to PAID', async () => {
      // Pay remaining ₹1,000
      const payment2 = await purchasePaymentService.createPayment(
        company1Id,
        {
          supplierId,
          purchaseId,
          amount: 1000,
          paymentMode: 'BANK_TRANSFER',
          referenceNo: 'NEFT-998877',
        },
        user1Id,
      );

      expect(payment2).toBeDefined();

      const purchase = await purchaseService.getPurchaseById(company1Id, purchaseId);
      expect(purchase?.amountPaid).toBe(1770);
      expect(purchase?.paymentStatus).toBe('PAID');

      // Supplier balance now settled to 0
      const supplier = await supplierService.getSupplierById(company1Id, supplierId);
      expect(supplier?.currentBalance).toBe(0);
    });

    it('should reverse a payment with reason and restore outstanding balance', async () => {
      // Reverse payment 1 (₹770)
      const reversed = await purchasePaymentService.reversePayment(
        company1Id,
        {
          paymentId: firstPaymentId,
          reversalReason: 'Duplicate bank entry correction',
        },
        user1Id,
      );

      expect(reversed.status).toBe('REVERSED');
      expect(reversed.reversalReason).toBe('Duplicate bank entry correction');

      // Purchase amountPaid is now 1770 - 770 = 1000, status becomes PARTIALLY_PAID
      const purchase = await purchaseService.getPurchaseById(company1Id, purchaseId);
      expect(purchase?.amountPaid).toBe(1000);
      expect(purchase?.paymentStatus).toBe('PARTIALLY_PAID');

      // Supplier balance increases back by ₹770 -> 770
      const supplier = await supplierService.getSupplierById(company1Id, supplierId);
      expect(supplier?.currentBalance).toBe(770);
    });
  });

  describe('5. Purchase Returns & Stock Reversals', () => {
    let supplierId: string;
    let purchaseId: string;
    let purchaseItemId: string;

    beforeAll(async () => {
      const s = await supplierService.createSupplier(
        company1Id,
        {
          name: 'Direct Bottlers Ltd',
          supplierCode: 'SUP-BOT-01',
          state: 'Maharashtra',
        },
        user1Id,
      );
      supplierId = s.id;

      const draft = await purchaseService.createDraft(
        company1Id,
        {
          supplierId,
          supplierInvoiceNumber: 'INV-BOT-100',
          locationId: defaultLocation1Id,
          items: [
            {
              productId: testProduct1Id,
              quantity: 100, // 100 @ 30 = 3000 + 18% tax (540) = 3540
              purchaseRate: 30,
              taxRate: 18,
            },
          ],
        },
        user1Id,
      );

      const posted = await purchaseService.postPurchase(company1Id, draft.id, user1Id);
      purchaseId = posted.id;
      purchaseItemId = posted.items![0]!.id;
    });

    it('should reject returning more than purchased eligible quantity', async () => {
      await expect(
        purchaseReturnService.createReturn(
          company1Id,
          {
            purchaseId,
            locationId: defaultLocation1Id,
            reason: 'Excess order',
            items: [
              {
                purchaseItemId,
                productId: testProduct1Id,
                quantity: 150, // Only 100 bought
              },
            ],
          },
          user1Id,
        ),
      ).rejects.toThrow(/exceeds remaining returnable quantity/i);
    });

    it('should process partial purchase return, reduce stock, and credit supplier balance', async () => {
      const stockBefore = await stockService.getProductStockSummary(company1Id, testProduct1Id);
      const initialStockQty = stockBefore.currentStock;

      const pReturn = await purchaseReturnService.createReturn(
        company1Id,
        {
          purchaseId,
          locationId: defaultLocation1Id,
          reason: 'Damaged during transit',
          items: [
            {
              purchaseItemId,
              productId: testProduct1Id,
              quantity: 10, // return 10 units: 10 * 30 = 300 + 18% tax (54) = 354
            },
          ],
        },
        user1Id,
      );

      expect(pReturn).toBeDefined();
      expect(pReturn.status).toBe('POSTED');
      expect(pReturn.grandTotal).toBe(354);

      // Stock should decrease by 10 units
      const stockAfter = await stockService.getProductStockSummary(company1Id, testProduct1Id);
      expect(stockAfter.currentStock).toBe(initialStockQty - 10);

      // Stock Movement should exist
      const movements = await stockService.getStockMovements(company1Id, {
        productId: testProduct1Id,
      });
      const returnMovement = movements.items.find((m) => m.referenceId === pReturn.id);
      expect(returnMovement).toBeDefined();
      expect(returnMovement?.movementType).toBe('PURCHASE_RETURN');
      expect(returnMovement?.quantity).toBe(-10);

      // Supplier balance should decrease by ₹354
      const supplier = await supplierService.getSupplierById(company1Id, supplierId);
      expect(supplier?.currentBalance).toBe(3540 - 354); // 3186

      // Purchase amountReturned should be 354
      const purchase = await purchaseService.getPurchaseById(company1Id, purchaseId);
      expect(purchase?.amountReturned).toBe(354);
    });
  });

  describe('6. Multi-Tenant Company Isolation', () => {
    it('should strictly isolate suppliers and purchases between Company 1 and Company 2', async () => {
      // Company 1 query
      const c1Suppliers = await supplierService.getSuppliers(company1Id);
      const c2Suppliers = await supplierService.getSuppliers(company2Id);

      expect(c1Suppliers.items.every((s) => s.companyId === company1Id)).toBe(true);
      expect(c2Suppliers.items.every((s) => s.companyId === company2Id)).toBe(true);

      const c1Purchases = await purchaseService.getPurchases(company1Id);
      const c2Purchases = await purchaseService.getPurchases(company2Id);

      expect(c1Purchases.items.every((p) => p.companyId === company1Id)).toBe(true);
      expect(c2Purchases.items.every((p) => p.companyId === company2Id)).toBe(true);

      // Company 2 should not be able to get Company 1 purchase by ID
      if (c1Purchases.items.length > 0) {
        const c1PurchaseId = c1Purchases.items[0]!.id;
        const result = await purchaseService.getPurchaseById(company2Id, c1PurchaseId);
        expect(result).toBeNull();
      }
    });
  });
});
