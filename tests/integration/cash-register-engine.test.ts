import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CompanyService } from '../../packages/business/src/services/company.service';
import { CashRegisterService } from '../../packages/business/src/services/cash-register.service';
import { CashbookService } from '../../packages/business/src/services/cashbook.service';
import { DayEndClosingService } from '../../packages/business/src/services/day-end-closing.service';
import { ProductService } from '../../packages/business/src/services/product.service';
import { StockService } from '../../packages/business/src/services/stock.service';
import { LocationService } from '../../packages/business/src/services/location.service';
import { CustomerService } from '../../packages/business/src/services/customer.service';
import { SupplierService } from '../../packages/business/src/services/supplier.service';
import { SalesService } from '../../packages/business/src/services/sales.service';
import { SalesPaymentService } from '../../packages/business/src/services/sales-payment.service';
import { SalesReturnService } from '../../packages/business/src/services/sales-return.service';
import { PurchasePaymentService } from '../../packages/business/src/services/purchase-payment.service';
import { PurchaseService } from '../../packages/business/src/services/purchase.service';
import { UnitService } from '../../packages/business/src/services/unit.service';
import { CategoryService } from '../../packages/business/src/services/category.service';
import {
  CashMovementType,
  CashRegisterSessionStatus,
} from '@rs-inventory/types';
import { createTestDatabase } from '../helpers/test-db';

describe('Cash Register, Sessions, Cashbook & Day-End Closing Engine Tests', () => {
  let cleanupFn: () => Promise<void>;
  let prisma: any;
  let companyService: CompanyService;
  let cashRegisterService: CashRegisterService;
  let cashbookService: CashbookService;
  let dayEndClosingService: DayEndClosingService;
  let productService: ProductService;
  let stockService: StockService;
  let locationService: LocationService;
  let customerService: CustomerService;
  let supplierService: SupplierService;
  let salesService: SalesService;
  let salesPaymentService: SalesPaymentService;
  let salesReturnService: SalesReturnService;
  let purchasePaymentService: PurchasePaymentService;
  let purchaseService: PurchaseService;

  let companyId: string;
  let userId: string;
  let defaultLocationId: string;
  let registerId: string;
  let productId: string;
  let customerId: string;
  let supplierId: string;

  beforeAll(async () => {
    const { dbService, cleanup } = await createTestDatabase();
    cleanupFn = cleanup;
    prisma = dbService.getClient();

    companyService = new CompanyService(prisma);
    cashRegisterService = new CashRegisterService(prisma);
    cashbookService = new CashbookService(prisma);
    dayEndClosingService = new DayEndClosingService(prisma);
    productService = new ProductService(prisma);
    stockService = new StockService(prisma);
    locationService = new LocationService(prisma);
    customerService = new CustomerService(prisma);
    supplierService = new SupplierService(prisma);
    salesService = new SalesService(prisma);
    salesPaymentService = new SalesPaymentService(prisma);
    salesReturnService = new SalesReturnService(prisma);
    purchasePaymentService = new PurchasePaymentService(prisma);
    purchaseService = new PurchaseService(prisma);
    const unitService = new UnitService(prisma);
    const categoryService = new CategoryService(prisma);

    // 1. Setup Company
    const setup = await companyService.setupCompanyAndAdmin({
      businessName: 'Metro Superstore Jaipur',
      adminFullName: 'Metro Admin',
      adminUsername: 'metroadmin',
      adminPassword: 'Password123!',
      gstRegistered: true,
      gstin: '08AAAAA2222A1Z2',
      state: 'Rajasthan',
    });
    companyId = setup.company.id;
    userId = setup.user.id;

    const loc = await locationService.getDefaultLocation(companyId);
    defaultLocationId = loc.id;

    // 2. Units & Category
    const units = await unitService.seedDefaultUnits(companyId);
    const pcsUnit = units.find((u) => u.shortCode === 'PCS') || units[0];
    const cat = await categoryService.createCategory(
      companyId,
      { name: 'Stationery Items', code: 'STAT' },
      userId,
    );

    // 3. Register Product & Add Stock
    const prod = await productService.createProduct(
      companyId,
      {
        name: 'Deluxe Notebook',
        sku: 'NB-DLX-01',
        unitId: pcsUnit.id,
        categoryId: cat.id,
        sellingPrice: 100,
        purchasePrice: 60,
        taxRate: 0,
        openingStock: 100,
        openingStockRate: 60,
        openingStockLocationId: defaultLocationId,
      },
      userId,
    );
    productId = prod.id;

    // 4. Customer & Supplier
    const cust = await customerService.createCustomer(
      companyId,
      { name: 'Kishan Kumar', phone: '9876543210', city: 'Jaipur' },
      userId,
    );
    customerId = cust.id;

    const supp = await supplierService.createSupplier(
      companyId,
      { name: 'Paper Mills Ltd', phone: '9123456780', city: 'Kota' },
      userId,
    );
    supplierId = supp.id;

    // 5. Default Cash Register
    const regList = await cashRegisterService.listRegisters(companyId);
    expect(regList.length).toBeGreaterThan(0);
    registerId = regList[0].id;
  });

  afterAll(async () => {
    if (cleanupFn) {
      await cleanupFn();
    }
  });

  describe('1. Cash Register Sessions Management', () => {
    let activeSessionId: string;

    it('should open a new session with opening cash float', async () => {
      const session = await cashRegisterService.openSession(
        companyId,
        { cashRegisterId: registerId, openingCash: 2000, openingNotes: 'Morning opening float 2000' },
        userId,
      );

      expect(session.id).toBeDefined();
      expect(session.sessionNumber).toMatch(/^SES-\d{6}$/);
      expect(session.status).toBe(CashRegisterSessionStatus.OPEN);
      expect(session.openingCash).toBe(2000);
      activeSessionId = session.id;

      // Check OPENING_CASH movement was created
      const openingMov = await prisma.cashMovement.findFirst({
        where: {
          companyId,
          cashRegisterSessionId: session.id,
          movementType: CashMovementType.OPENING_CASH,
        },
      });
      expect(openingMov).not.toBeNull();
      expect(openingMov!.amount).toBe(2000);
    });

    it('should prevent opening another session while one is active on the same register', async () => {
      await expect(
        cashRegisterService.openSession(
          companyId,
          { cashRegisterId: registerId, openingCash: 1000 },
          userId,
        ),
      ).rejects.toThrow(/already has an active session/i);
    });

    it('should retrieve the active session via getActiveSession', async () => {
      const active = await cashRegisterService.getActiveSession(companyId, registerId);
      expect(active).not.toBeNull();
      expect(active!.id).toBe(activeSessionId);
    });
  });

  describe('2. Cash In and Cash Out Operations', () => {
    it('should record Cash In correctly and update drawer balance', async () => {
      const movement = await cashRegisterService.recordCashIn(
        companyId,
        {
          amount: 500,
          reason: 'Owner infused small change denominations',
        },
        userId,
      );

      expect(movement.id).toBeDefined();
      expect(movement.movementNumber).toMatch(/^MOV-\d{6}$/);
      expect(movement.movementType).toBe(CashMovementType.CASH_IN);
      expect(movement.amount).toBe(500);
    });

    it('should record Cash Out correctly and update drawer balance', async () => {
      const movement = await cashRegisterService.recordCashOut(
        companyId,
        {
          amount: 300,
          reason: 'Postage courier payment',
        },
        userId,
      );

      expect(movement.movementType).toBe(CashMovementType.CASH_OUT);
      expect(movement.amount).toBe(300);
    });

    it('should reject zero or negative amounts for Cash In/Out', async () => {
      await expect(
        cashRegisterService.recordCashIn(companyId, { amount: 0, reason: 'Invalid' }, userId),
      ).rejects.toThrow(/greater than zero/i);

      await expect(
        cashRegisterService.recordCashOut(companyId, { amount: -50, reason: 'Invalid' }, userId),
      ).rejects.toThrow(/greater than zero/i);
    });
  });

  describe('3. Seamless Transaction Integration Without Double-Counting', () => {
    let sale1: any;

    it('should record CASH_SALE cash movement on POS cash sale', async () => {
      // Create and post pure cash sale of 2 notebooks = ₹200
      const draft = await salesService.createDraft(
        companyId,
        {
          customerId,
          items: [{ productId, quantity: 2, unitPrice: 100, taxRate: 0 }],
        },
        userId,
      );

      sale1 = await salesService.postSale(
        companyId,
        draft.id,
        {
          payments: [{ amount: 200, paymentMode: 'CASH' }],
        },
        userId,
      );

      // Verify cash movement
      const mov = await prisma.cashMovement.findFirst({
        where: {
          companyId,
          referenceId: sale1.id,
          movementType: 'CASH_SALE',
        },
      });
      expect(mov).not.toBeNull();
      expect(mov!.amount).toBe(200);
    });

    it('should record only the cash portion in split tender sale', async () => {
      // Split payment: 3 notebooks = ₹300 total (₹100 Cash, ₹200 UPI)
      const draft = await salesService.createDraft(
        companyId,
        {
          customerId,
          items: [{ productId, quantity: 3, unitPrice: 100, taxRate: 0 }],
        },
        userId,
      );

      const sale2 = await salesService.postSale(
        companyId,
        draft.id,
        {
          payments: [
            { amount: 100, paymentMode: 'CASH' },
            { amount: 200, paymentMode: 'UPI', referenceNo: 'UPI-987' },
          ],
        },
        userId,
      );

      // Verify only ₹100 is recorded as CASH_SALE movement
      const movements = await prisma.cashMovement.findMany({
        where: {
          companyId,
          referenceId: sale2.id,
        },
      });
      expect(movements.length).toBe(1);
      expect(movements[0].amount).toBe(100);
      expect(movements[0].movementType).toBe('CASH_SALE');
    });

    it('should record CUSTOMER_PAYMENT when customer pays Khata balance in cash', async () => {
      const payment = await salesPaymentService.createPayment(
        companyId,
        {
          customerId,
          amount: 400,
          paymentMode: 'CASH',
          notes: 'Khata cash installment',
        },
        userId,
      );

      const mov = await prisma.cashMovement.findFirst({
        where: {
          companyId,
          referenceId: payment.id,
          movementType: 'CUSTOMER_PAYMENT',
        },
      });
      expect(mov).not.toBeNull();
      expect(mov!.amount).toBe(400);
    });

    it('should record SUPPLIER_CASH_PAYMENT when paying supplier in cash', async () => {
      // 1. Create a PO first and post it
      const po = await purchaseService.createPurchase(
        companyId,
        {
          supplierId,
          locationId: defaultLocationId,
          items: [{ productId, quantity: 10, purchaseRate: 50, taxRate: 0 }],
        },
        userId,
      );
      await purchaseService.postPurchase(companyId, po.id, userId);

      // 2. Pay supplier in cash ₹250
      const suppPayment = await purchasePaymentService.createPayment(
        companyId,
        {
          supplierId,
          purchaseId: po.id,
          amount: 250,
          paymentMode: 'CASH',
          notes: 'Part payment in cash',
        },
        userId,
      );

      const mov = await prisma.cashMovement.findFirst({
        where: {
          companyId,
          referenceId: suppPayment.id,
          movementType: 'SUPPLIER_CASH_PAYMENT',
        },
      });
      expect(mov).not.toBeNull();
      expect(mov!.amount).toBe(250);
    });

    it('should record CASH_REFUND when returning sales items for cash refund', async () => {
      // Get detailed sale1 with items
      const fullSale = await salesService.getSale(companyId, sale1.id);

      // Return 1 notebook with cash refund ₹100
      const sReturn = await salesReturnService.createReturn(
        companyId,
        {
          originalSalesInvoiceId: sale1.id,
          refundMode: 'CASH',
          items: [
            {
              originalSalesInvoiceItemId: fullSale!.items[0].id,
              productId,
              quantity: 1,
              restockCondition: 'RESELLABLE',
              reason: 'Customer bought extra copy',
            },
          ],
        },
        userId,
      );

      const mov = await prisma.cashMovement.findFirst({
        where: {
          companyId,
          referenceId: sReturn.id,
          movementType: 'CASH_REFUND',
        },
      });
      expect(mov).not.toBeNull();
      expect(mov!.amount).toBe(100);
    });
  });

  describe('4. Cashbook Ledger & Running Balance Verification', () => {
    it('should compute accurate chronological running balance', async () => {
      const activeSession = await cashRegisterService.getActiveSession(companyId, registerId);
      expect(activeSession).not.toBeNull();

      const { entries, summary } = await cashbookService.getCashbook(companyId, {
        cashRegisterSessionId: activeSession!.id,
      });

      expect(entries.length).toBeGreaterThanOrEqual(7);

      // Verify running balance arithmetic:
      // Opening Cash: 2000
      // Cash In: +500 -> 2500
      // Cash Out: -300 -> 2200
      // Cash Sale: +200 -> 2400
      // Split Cash Sale: +100 -> 2500
      // Customer Khata Payment: +400 -> 2900
      // Supplier Cash Payment: -250 -> 2650
      // Sales Return Refund: -100 -> 2550
      // Total Inflows = 2000 (opening) + 500 + 200 + 100 + 400 = 3200
      // Total Outflows = 300 + 250 + 100 = 650
      // Expected closing = 3200 - 650 = 2550

      const lastEntry = entries[entries.length - 1];
      expect(lastEntry.runningBalance).toBe(2550);

      expect(summary.totalCashIn).toBe(3200);
      expect(summary.totalCashOut).toBe(650);
      expect(summary.openingBalance).toBe(0);
      expect(summary.closingBalance).toBe(2550);
    });
  });

  describe('5. Day-End Closing Reconciliation, Differences & Lockout', () => {
    let activeSessionId: string;

    beforeAll(async () => {
      const active = await cashRegisterService.getActiveSession(companyId, registerId);
      activeSessionId = active!.id;
    });

    it('should generate accurate Day-End Closing Preview', async () => {
      const preview = await dayEndClosingService.getClosingPreview(companyId, activeSessionId);

      expect(preview.openingCash).toBe(2000);
      expect(preview.cashSales).toBe(300); // 200 + 100
      expect(preview.cashIn).toBe(500);
      expect(preview.customerCashReceipts).toBe(400);
      expect(preview.cashOut).toBe(300);
      expect(preview.supplierCashPayments).toBe(250);
      expect(preview.cashRefunds).toBe(100);
      expect(preview.expectedCash).toBe(2550);
    });

    it('should require discrepancy explanation if counted cash != expected cash', async () => {
      // Expected is 2550. Counted is 2500 (₹50 shortage). Discrepancy reason omitted.
      await expect(
        dayEndClosingService.performDayEndClosing(
          companyId,
          {
            cashRegisterSessionId: activeSessionId,
            businessDate: new Date(),
            countedCash: 2500,
            denominations: { '500': 5 }, // 2500
          },
          userId,
        ),
      ).rejects.toThrow(/mandatory|discrepancy|note|explanation/i);
    });

    it('should successfully perform Day-End Closing with reconciliation details', async () => {
      const closing = await dayEndClosingService.performDayEndClosing(
        companyId,
        {
          cashRegisterSessionId: activeSessionId,
          businessDate: new Date(),
          countedCash: 2550, // Exact match
          denominations: { '500': 5, '50': 1 }, // 2550
          notes: 'Shift closed with zero discrepancy',
        },
        userId,
      );

      expect(closing.id).toBeDefined();
      expect(closing.closingNumber).toMatch(/^CLS-\d{6}$/);
      expect(closing.expectedCash).toBe(2550);
      expect(closing.countedCash).toBe(2550);
      expect(closing.cashDifference).toBe(0);

      // Session must be marked CLOSED
      const session = await prisma.cashRegisterSession.findUnique({
        where: { id: activeSessionId },
      });
      expect(session!.status).toBe(CashRegisterSessionStatus.CLOSED);
      expect(session!.countedCash).toBe(2550);
      expect(session!.closedAt).not.toBeNull();
    });

    it('should reject ordinary cash operations when session is closed', async () => {
      // Attempt Cash In on closed session
      await expect(
        cashRegisterService.recordCashIn(
          companyId,
          { amount: 100, reason: 'Late cash in' },
          userId,
        ),
      ).rejects.toThrow(/no active.*session/i);
    });

    it('should allow authorized reopening of a closed session with audit trace', async () => {
      const reopened = await cashRegisterService.reopenSession(
        companyId,
        activeSessionId,
        userId,
        'Manager authorized reopening to correct misplaced voucher',
      );

      expect(reopened.status).toBe(CashRegisterSessionStatus.OPEN);
      expect(reopened.closedAt).toBeNull();
      expect(reopened.countedCash).toBeNull();

      // Active session check should return reopened session
      const active = await cashRegisterService.getActiveSession(companyId, registerId);
      expect(active).not.toBeNull();
      expect(active!.id).toBe(activeSessionId);
    });
  });
});
