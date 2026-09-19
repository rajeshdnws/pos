import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CategoryService } from '../../packages/business/src/services/category.service';
import { CompanyService } from '../../packages/business/src/services/company.service';
import { CustomerService } from '../../packages/business/src/services/customer.service';
import { LocationService } from '../../packages/business/src/services/location.service';
import { ProductService } from '../../packages/business/src/services/product.service';
import { SalesPaymentService } from '../../packages/business/src/services/sales-payment.service';
import { SalesReturnService } from '../../packages/business/src/services/sales-return.service';
import { SalesService } from '../../packages/business/src/services/sales.service';
import { StockService } from '../../packages/business/src/services/stock.service';
import { UnitService } from '../../packages/business/src/services/unit.service';
import { createTestDatabase } from '../helpers/test-db';

describe('Sales Management, POS Billing, Customers & Returns Engine Integration Tests', () => {
  let cleanupFn: () => Promise<void>;
  let prisma: any;
  let companyService: CompanyService;
  let productService: ProductService;
  let locationService: LocationService;
  let stockService: StockService;
  let customerService: CustomerService;
  let salesService: SalesService;
  let salesPaymentService: SalesPaymentService;
  let salesReturnService: SalesReturnService;
  let unitService: UnitService;

  let companyId: string;
  let userId: string;
  let defaultLocationId: string;
  let testProductId: string;
  let testCustomerId: string;

  beforeAll(async () => {
    const { dbService, cleanup } = await createTestDatabase();
    cleanupFn = cleanup;
    prisma = dbService.getClient();

    companyService = new CompanyService(prisma);
    productService = new ProductService(prisma);
    locationService = new LocationService(prisma);
    stockService = new StockService(prisma);
    customerService = new CustomerService(prisma);
    salesService = new SalesService(prisma);
    salesPaymentService = new SalesPaymentService(prisma);
    salesReturnService = new SalesReturnService(prisma);
    unitService = new UnitService(prisma);
    const categoryService = new CategoryService(prisma);

    // Setup Test Company
    const setup = await companyService.setupCompanyAndAdmin({
      businessName: 'Retail Solo Delhi',
      adminFullName: 'Retail Admin',
      adminUsername: 'retailadmin',
      adminPassword: 'Password123!',
      gstRegistered: true,
      gstin: '07AAAAA0000A1Z5',
      state: 'Delhi',
    });
    companyId = setup.company.id;
    userId = setup.user.id;

    const loc = await locationService.getDefaultLocation(companyId);
    defaultLocationId = loc.id;

    // Seed units & categories
    const units = await unitService.seedDefaultUnits(companyId);
    const pcsUnit = units.find((u) => u.shortCode === 'PCS') || units[0];

    const cat = await categoryService.createCategory(
      companyId,
      { name: 'Groceries' },
      userId,
    );

    // Create Test Product with initial stock of 100
    const prod = await productService.createProduct(
      companyId,
      {
        name: 'Basmati Rice 1kg',
        sku: 'RICE-001',
        barcode: '8901111222333',
        categoryId: cat.id,
        unitId: pcsUnit!.id,
        purchasePrice: 80,
        sellingPrice: 120,
        taxRate: 5,
        openingStock: 100,
        openingStockRate: 80,
        openingStockLocationId: defaultLocationId,
      },
      userId,
    );
    testProductId = prod.id;

    // Create Test Customer with ₹500 opening balance
    const cust = await customerService.createCustomer(
      companyId,
      {
        name: 'Ramesh Sharma',
        phone: '9876543210',
        customerType: 'RETAIL',
        creditLimit: 5000,
        creditPeriodDays: 15,
        openingBalance: 500,
        openingBalanceType: 'RECEIVABLE',
      },
      userId,
    );
    testCustomerId = cust.id;
  });

  afterAll(async () => {
    if (cleanupFn) await cleanupFn();
  });

  it('should initialize customer with correct opening balance and ledger entry', async () => {
    const cust = await customerService.getCustomer(companyId, testCustomerId);
    expect(cust.currentBalance).toBe(500);

    const statement = await customerService.getStatement(companyId, testCustomerId);
    expect(statement.closingBalance).toBe(500);
    expect(statement.entries.length).toBeGreaterThanOrEqual(1);
    expect(statement.entries[0].transactionType).toBe('OPENING_BALANCE');
  });

  it('should create and post a POS cash sale, reducing inventory and recording payment', async () => {
    // 1. Create Draft
    const draft = await salesService.createDraft(
      companyId,
      {
        customerId: testCustomerId,
        isInterstate: false,
        items: [
          {
            productId: testProductId,
            quantity: 5,
            unitPrice: 120,
            taxRate: 5,
          },
        ],
      },
      userId,
    );

    expect(draft.status).toBe('DRAFT');
    expect(draft.subtotal).toBe(600); // 5 * 120
    expect(draft.taxableAmount).toBe(600);
    expect(draft.grandTotal).toBe(630); // 600 + 5% GST = 630

    // 2. Post Sale with Full Cash Payment
    const posted = await salesService.postSale(
      companyId,
      draft.id,
      {
        payments: [
          {
            amount: 630,
            paymentMode: 'CASH',
          },
        ],
      },
      userId,
    );

    expect(posted.status).toBe('POSTED');
    expect(posted.paymentStatus).toBe('PAID');
    expect(posted.amountPaid).toBe(630);

    // 3. Verify Product Stock deducted by 5 (100 - 5 = 95)
    const productAfter = await productService.getProduct(testProductId, companyId);
    expect(productAfter?.currentStock).toBe(95);

    // 4. Verify Customer Balance remains 500 (since cash payment offset the invoice amount)
    const custAfter = await customerService.getCustomer(companyId, testCustomerId);
    expect(custAfter.currentBalance).toBe(500);
  });

  it('should create a credit sale to Khata, increasing customer balance', async () => {
    const draft = await salesService.createDraft(
      companyId,
      {
        customerId: testCustomerId,
        isInterstate: false,
        items: [
          {
            productId: testProductId,
            quantity: 10,
            unitPrice: 120,
            taxRate: 5,
          },
        ],
      },
      userId,
    );

    // Grand total: 10 * 120 = 1200 + 5% = 1260
    expect(draft.grandTotal).toBe(1260);

    // Post without payments -> Billed on Khata Credit
    const posted = await salesService.postSale(companyId, draft.id, { payments: [] }, userId);

    expect(posted.status).toBe('POSTED');
    expect(posted.paymentStatus).toBe('UNPAID');

    // Customer balance: 500 + 1260 = 1760
    const custAfter = await customerService.getCustomer(companyId, testCustomerId);
    expect(custAfter.currentBalance).toBe(1760);

    // Stock deducted: 95 - 10 = 85
    const productAfter = await productService.getProduct(testProductId, companyId);
    expect(productAfter?.currentStock).toBe(85);
  });

  it('should record customer payment against Khata, reducing customer balance', async () => {
    const payment = await salesPaymentService.createPayment(
      companyId,
      {
        customerId: testCustomerId,
        amount: 760,
        paymentMode: 'UPI',
        referenceNo: 'UPI-TXN-123456',
        notes: 'Partial payment via GooglePay',
      },
      userId,
    );

    expect(payment.amount).toBe(760);

    // Customer balance: 1760 - 760 = 1000
    const custAfter = await customerService.getCustomer(companyId, testCustomerId);
    expect(custAfter.currentBalance).toBe(1000);
  });

  it('should process sales return for resellable items, restoring stock and crediting customer', async () => {
    // List posted sales and load full details with items
    const salesList = await salesService.listSales(companyId, { status: 'POSTED' });
    const lastSale = await salesService.getSale(companyId, salesList.items[0].id);

    // Return 2 units
    const ret = await salesReturnService.createReturn(
      companyId,
      {
        originalSalesInvoiceId: lastSale.id,
        items: [
          {
            originalSalesInvoiceItemId: lastSale.items[0].id,
            productId: testProductId,
            quantity: 2,
            restockCondition: 'RESELLABLE',
            reason: 'Excess quantity bought by customer',
          },
        ],
      },
      userId,
    );

    expect(ret.status).toBe('POSTED');

    // Stock should increase by 2 (85 + 2 = 87)
    const productAfter = await productService.getProduct(testProductId, companyId);
    expect(productAfter?.currentStock).toBe(87);

    // Verify invoice amountReturned was incremented
    const invAfter = await salesService.getSale(companyId, lastSale.id);
    expect(invAfter?.amountReturned).toBeGreaterThan(0);
  });
});
