import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CompanyService } from '../../packages/business/src/services/company.service';
import { CustomerService } from '../../packages/business/src/services/customer.service';
import { LocationService } from '../../packages/business/src/services/location.service';
import { ProductService } from '../../packages/business/src/services/product.service';
import { UnitService } from '../../packages/business/src/services/unit.service';
import { CategoryService } from '../../packages/business/src/services/category.service';
import { SalesService } from '../../packages/business/src/services/sales.service';
import { CouponService } from '../../packages/business/src/services/promotions/coupon.service';
import { PromotionReportService } from '../../packages/business/src/services/promotions/promotion-report.service';
import { MessageTemplateService } from '../../packages/business/src/services/communication/template.service';
import { createTestDatabase } from '../helpers/test-db';

describe('Promotions, Campaigns & Coupon Management Engine - Integration Tests', () => {
  let cleanupFn: () => Promise<void>;
  let prisma: any;
  let companyService: CompanyService;
  let customerService: CustomerService;
  let salesService: SalesService;
  let couponService: CouponService;
  let promotionReportService: PromotionReportService;
  let templateService: MessageTemplateService;

  let companyId: string;
  let userId: string;
  let defaultLocationId: string;
  let testCustomerId: string;
  let testProductId: string;

  beforeAll(async () => {
    const { dbService, cleanup } = await createTestDatabase();
    cleanupFn = cleanup;
    prisma = dbService.getClient();

    companyService = new CompanyService(prisma);
    customerService = new CustomerService(prisma);
    salesService = new SalesService(prisma);
    const locationService = new LocationService(prisma);
    const productService = new ProductService(prisma);
    const unitService = new UnitService(prisma);
    const categoryService = new CategoryService(prisma);

    couponService = new CouponService(prisma);
    promotionReportService = new PromotionReportService(prisma);
    templateService = new MessageTemplateService(prisma);

    // Setup Test Company
    const setup = await companyService.setupCompanyAndAdmin({
      businessName: 'Promotions Test Store',
      adminFullName: 'Promotions Admin',
      adminUsername: 'promo_admin',
      adminPassword: 'Password123!',
      gstRegistered: true,
      gstin: '07AAAAA0000A1Z5',
      state: 'Delhi',
    });
    companyId = setup.company.id;
    userId = setup.user.id;

    const loc = await locationService.getDefaultLocation(companyId);
    defaultLocationId = loc.id;

    const units = await unitService.seedDefaultUnits(companyId);
    const pcsUnit = units.find((u) => u.shortCode === 'PCS') || units[0];
    const cat = await categoryService.createCategory(companyId, { name: 'Apparel' }, userId);

    const prod = await productService.createProduct(
      companyId,
      {
        name: 'Cotton T-Shirt',
        sku: 'TSHIRT-01',
        categoryId: cat.id,
        unitId: pcsUnit!.id,
        purchasePrice: 200,
        sellingPrice: 500,
        taxRate: 5,
        openingStock: 50,
        openingStockRate: 200,
        openingStockLocationId: defaultLocationId,
      },
      userId,
    );
    testProductId = prod.id;

    const cust = await customerService.createCustomer(
      companyId,
      {
        name: 'Anita Verma',
        phone: '9811223344',
        email: 'anita@example.com',
      },
      userId,
    );
    testCustomerId = cust.id;
  });

  afterAll(async () => {
    if (cleanupFn) {
      await cleanupFn();
    }
  });

  it('creates and lists message templates', async () => {
    const template = await templateService.createTemplate(companyId, {
      name: 'Festive Offer SMS',
      channel: 'SMS',
      templateType: 'PROMOTIONAL',
      body: 'Hi {{customer_name}}, get {{discount_value}} off with code {{coupon_code}} at {{business_name}}!',
    });

    expect(template).toBeDefined();
    expect(template.name).toBe('Festive Offer SMS');
    expect(template.placeholders).toContain('{{customer_name}}');
    expect(template.placeholders).toContain('{{coupon_code}}');

    const templatesList = await templateService.listTemplates(companyId);
    expect(templatesList.some((t) => t.id === template.id)).toBe(true);
  });

  it('creates a standard promotional coupon with percentage discount and cap', async () => {
    const coupon = await couponService.createCoupon(
      companyId,
      {
        code: 'SUMMER20',
        name: 'Summer Sale 20%',
        discountType: 'PERCENTAGE',
        discountValue: 20,
        minimumPurchase: 1000,
        maximumDiscount: 300,
        validFrom: new Date(Date.now() - 86400000).toISOString(),
        validUntil: new Date(Date.now() + 30 * 86400000).toISOString(),
        applicabilityMode: 'ANY_ELIGIBLE_PURCHASE',
        maximumRedemptions: 50,
        maximumRedemptionsPerCustomer: 2,
      },
      userId,
    );

    expect(coupon).toBeDefined();
    expect(coupon.code).toBe('SUMMER20');
    expect(coupon.discountValue).toBe(20);
    expect(coupon.minimumPurchase).toBe(1000);
    expect(coupon.maximumDiscount).toBe(300);
  });

  it('rejects coupon validation if minimum purchase threshold is not met', async () => {
    const validation = await couponService.validateCoupon(companyId, {
      code: 'SUMMER20',
      customerId: testCustomerId,
      subtotal: 600, // Below 1000 min purchase
      items: [{ productId: testProductId, quantity: 1, sellingRate: 600 }],
    });

    expect(validation.isValid).toBe(false);
    expect(validation.discountAmount).toBe(0);
    expect(validation.message).toContain('Minimum purchase');
  });

  it('validates coupon and enforces maximum discount cap when cart is eligible', async () => {
    // 20% of 2000 is 400, but capped at 300
    const validation = await couponService.validateCoupon(companyId, {
      code: 'SUMMER20',
      customerId: testCustomerId,
      subtotal: 2000,
      items: [{ productId: testProductId, quantity: 4, sellingRate: 500 }],
    });

    expect(validation.isValid).toBe(true);
    expect(validation.discountAmount).toBe(300);
  });

  it('issues a Next-Bill coupon tied to customer and issuing invoice', async () => {
    const draftInvoice = await salesService.createDraft(
      companyId,
      {
        customerId: testCustomerId,
        locationId: defaultLocationId,
        invoiceDate: new Date().toISOString().slice(0, 10),
        items: [{ productId: testProductId, quantity: 1 }],
      },
      userId,
    );
    const issuingInvoiceId = draftInvoice.id;

    const nextBillCoupon = await couponService.issueNextBillCoupon(
      companyId,
      {
        customerId: testCustomerId,
        discountType: 'PERCENTAGE',
        discountValue: 15,
        minimumPurchase: 500,
        maximumDiscount: 250,
        validityDays: 14,
        issuingSalesInvoiceId: issuingInvoiceId,
        deliveryChannel: 'PRINTED',
      },
      userId,
    );

    expect(nextBillCoupon).toBeDefined();
    expect(nextBillCoupon.applicabilityMode).toBe('NEXT_ELIGIBLE_PURCHASE');
    expect(nextBillCoupon.customerId).toBe(testCustomerId);
    expect(nextBillCoupon.status).toBe('ACTIVE');

    // Rule 1: CANNOT be redeemed on the current bill that issued it!
    const selfValidation = await couponService.validateCoupon(
      companyId,
      {
        code: nextBillCoupon.code,
        customerId: testCustomerId,
        subtotal: 1000,
        items: [{ productId: testProductId, quantity: 2, sellingRate: 500 }],
      },
      issuingInvoiceId, // Current sales invoice matches issuing invoice
    );

    expect(selfValidation.isValid).toBe(false);
    expect(selfValidation.message).toContain('only valid on future purchases');

    // Rule 2: CAN be redeemed on a future bill!
    const futureValidation = await couponService.validateCoupon(
      companyId,
      {
        code: nextBillCoupon.code,
        customerId: testCustomerId,
        subtotal: 1000,
        items: [{ productId: testProductId, quantity: 2, sellingRate: 500 }],
      },
      'inv-future-bill-002', // Different sales invoice ID
    );

    expect(futureValidation.isValid).toBe(true);
    // 15% of 1000 = 150
    expect(futureValidation.discountAmount).toBe(150);
  });

  it('atomically redeems coupon and increments redemption counter', async () => {
    const coupon = await couponService.createCoupon(
      companyId,
      {
        code: 'REDEEM100',
        name: 'Flat 100 Off',
        discountType: 'FIXED_AMOUNT',
        discountValue: 100,
        minimumPurchase: 500,
        validFrom: new Date(Date.now() - 86400000).toISOString(),
        validUntil: new Date(Date.now() + 30 * 86400000).toISOString(),
        applicabilityMode: 'ANY_ELIGIBLE_PURCHASE',
        maximumRedemptions: 10,
        maximumRedemptionsPerCustomer: 1,
      },
      userId,
    );

    expect(coupon.currentRedemptionsCount).toBe(0);

    const redemptionInvoice = await salesService.createDraft(
      companyId,
      {
        customerId: testCustomerId,
        locationId: defaultLocationId,
        invoiceDate: new Date().toISOString().slice(0, 10),
        items: [{ productId: testProductId, quantity: 2 }],
      },
      userId,
    );

    // Perform atomic transaction redemption
    const redemptionResult = await prisma.$transaction(async (tx: any) => {
      return await couponService.redeemCouponInTransaction(
        tx,
        companyId,
        coupon.id,
        testCustomerId,
        redemptionInvoice.id,
        800, // before discount
        700, // after discount
        userId,
      );
    });

    expect(redemptionResult).toBeDefined();
    expect(redemptionResult.discountAmount).toBe(100);

    // Check that counter incremented
    const refreshedCoupon = await couponService.getCouponById(companyId, coupon.id);
    expect(refreshedCoupon?.currentRedemptionsCount).toBe(1);

    // Customer redemption limit should now prevent second redemption
    const secondValidation = await couponService.validateCoupon(companyId, {
      code: 'REDEEM100',
      customerId: testCustomerId,
      subtotal: 800,
      items: [{ productId: testProductId, quantity: 2, sellingRate: 400 }],
    });

    expect(secondValidation.isValid).toBe(false);
    expect(secondValidation.message).toContain('already redeemed this coupon the maximum allowed times');
  });

  it('aggregates promotion KPIs accurately', async () => {
    const kpis = await promotionReportService.getPromotionsKPIs(companyId);

    expect(kpis).toBeDefined();
    expect(kpis.totalCouponsIssued).toBeGreaterThanOrEqual(1);
    expect(kpis.couponsRedeemed).toBeGreaterThanOrEqual(1);
    expect(kpis.totalDiscountRedeemed).toBeGreaterThanOrEqual(100);
  });
});
