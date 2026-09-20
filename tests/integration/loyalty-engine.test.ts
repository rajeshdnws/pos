import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CompanyService } from '../../packages/business/src/services/company.service';
import { CustomerService } from '../../packages/business/src/services/customer.service';
import { LocationService } from '../../packages/business/src/services/location.service';
import { ProductService } from '../../packages/business/src/services/product.service';
import { UnitService } from '../../packages/business/src/services/unit.service';
import { CategoryService } from '../../packages/business/src/services/category.service';
import { SalesService } from '../../packages/business/src/services/sales.service';
import { SalesReturnService } from '../../packages/business/src/services/sales-return.service';
import {
  LoyaltySettingsService,
  LoyaltyWalletService,
  LoyaltyRedemptionService,
  LoyaltyExpiryService,
  LoyaltyReportService,
} from '../../packages/business/src/services/loyalty';
import { createTestDatabase } from '../helpers/test-db';

describe('Customer Wallet & Loyalty Points Engine - Integration Tests', () => {
  let cleanupFn: () => Promise<void>;
  let prisma: any;
  let companyService: CompanyService;
  let customerService: CustomerService;
  let salesService: SalesService;
  let salesReturnService: SalesReturnService;
  let loyaltySettingsService: LoyaltySettingsService;
  let loyaltyWalletService: LoyaltyWalletService;
  let loyaltyRedemptionService: LoyaltyRedemptionService;
  let loyaltyExpiryService: LoyaltyExpiryService;
  let loyaltyReportService: LoyaltyReportService;

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
    salesReturnService = new SalesReturnService(prisma);
    const locationService = new LocationService(prisma);
    const productService = new ProductService(prisma);
    const unitService = new UnitService(prisma);
    const categoryService = new CategoryService(prisma);

    loyaltySettingsService = new LoyaltySettingsService(prisma);
    loyaltyWalletService = new LoyaltyWalletService(prisma);
    loyaltyRedemptionService = new LoyaltyRedemptionService(prisma);
    loyaltyExpiryService = new LoyaltyExpiryService(prisma);
    loyaltyReportService = new LoyaltyReportService(prisma);

    // Setup Test Company
    const setup = await companyService.setupCompanyAndAdmin({
      businessName: 'Loyalty Test Retailer',
      adminFullName: 'Loyalty Manager',
      adminUsername: 'loyaltyadmin',
      adminPassword: 'Password123!',
      adminPin: '1234',
    });
    companyId = setup.company.id;
    userId = setup.user.id;

    // Default Location
    const loc = await locationService.getDefaultLocation(companyId);
    defaultLocationId = loc!.id;

    // Unit & Category
    const units = await unitService.getUnits(companyId);
    const unit = units[0];
    const cat = await categoryService.createCategory(companyId, {
      name: 'Loyalty Goods',
    });

    // Product
    const prod = await productService.createProduct(companyId, {
      name: 'Rewardable Item',
      sku: 'LOY-001',
      unitId: unit.id,
      categoryId: cat.id,
      sellingPrice: 200,
      costPrice: 100,
      taxRate: 0,
      minStockLevel: 0,
      trackStock: false,
    });
    testProductId = prod.id;

    // Test Customer
    const cust = await customerService.createCustomer(companyId, {
      name: 'Priya Sharma',
      phone: '9876543210',
    });
    testCustomerId = cust.id;
  }, 30000);

  afterAll(async () => {
    if (cleanupFn) await cleanupFn();
  });

  describe('1. Loyalty Settings Configuration', () => {
    it('initializes default settings with enabled: false', async () => {
      const settings = await loyaltySettingsService.getSettings(companyId);
      expect(settings).toBeDefined();
      expect(settings.enabled).toBe(false);
      expect(settings.earningMethod).toBe('AMOUNT_SPENT');
      expect(settings.eligibleAmount).toBe(100);
      expect(settings.pointsPerEligibleAmount).toBe(1);
    });

    it('enables loyalty program and configures 1 point per ₹100 spent', async () => {
      const updated = await loyaltySettingsService.updateSettings(
        companyId,
        {
          enabled: true,
          eligibleAmount: 100,
          pointsPerEligibleAmount: 1,
          redemptionValue: 1.0,
          minimumRedemptionPoints: 10,
          minimumBillAmount: 100,
          maximumRedemptionPercentage: 50,
          pointExpiryDays: 90,
          allowEarningOnDiscountedBills: true,
          allowEarningOnBillsWithRedemption: true,
          negativeBalancePolicy: 'ALLOW_NEGATIVE',
        },
        userId,
      );

      expect(updated.enabled).toBe(true);
      expect(updated.pointExpiryDays).toBe(90);
    });
  });

  describe('2. Customer Wallet & Manual Adjustments', () => {
    it('creates a fresh wallet with 0 available points', async () => {
      const wallet = await loyaltyWalletService.getOrCreateWallet(companyId, testCustomerId);
      expect(wallet).toBeDefined();
      expect(wallet.cachedAvailablePoints).toBe(0);
      expect(wallet.cachedLifetimeEarned).toBe(0);
    });

    it('credits 150 points via manual adjustment with mandatory reason', async () => {
      const txn = await loyaltyWalletService.manualAdjustment(
        companyId,
        {
          customerId: testCustomerId,
          adjustmentType: 'CREDIT',
          points: 150,
          reason: 'Initial loyalty welcome bonus',
        },
        userId,
      );

      expect(txn.points).toBe(150);
      expect(txn.balanceAfter).toBe(150);
      expect(txn.transactionType).toBe('MANUAL_CREDIT');

      const wallet = await loyaltyWalletService.getOrCreateWallet(companyId, testCustomerId);
      expect(wallet.cachedAvailablePoints).toBe(150);
      expect(wallet.cachedLifetimeEarned).toBe(150);
    });

    it('debits 50 points via manual adjustment', async () => {
      const txn = await loyaltyWalletService.manualAdjustment(
        companyId,
        {
          customerId: testCustomerId,
          adjustmentType: 'DEBIT',
          points: 50,
          reason: 'Correction of extra points awarded',
        },
        userId,
      );

      expect(txn.points).toBe(-50);
      expect(txn.balanceAfter).toBe(100);

      const wallet = await loyaltyWalletService.getOrCreateWallet(companyId, testCustomerId);
      expect(wallet.cachedAvailablePoints).toBe(100);
    });

    it('reconciles wallet balance against authoritative ledger sum', async () => {
      const rec = await loyaltyWalletService.reconcileWallet(companyId, testCustomerId);
      expect(rec.reconciled).toBe(false); // already matches 100
      expect(rec.newBalance).toBe(100);
    });
  });

  describe('3. POS Billing Points Redemption & Earning', () => {
    it('validates redemption eligibility and caps at 50% max bill', async () => {
      // Bill subtotal: ₹400. 50% of ₹400 = ₹200 = 200 pts. Customer has 100 pts.
      const val = await loyaltyRedemptionService.validateRedemption(companyId, {
        customerId: testCustomerId,
        billSubtotal: 400,
        requestedPoints: 50,
      });

      expect(val.isValid).toBe(true);
      expect(val.pointsToRedeem).toBe(50);
      expect(val.discountAmount).toBe(50);
    });

    it('posts sale with points redemption: deducts points and awards new points on cash portion', async () => {
      // Create sales draft for ₹400 with 50 points redeemed (₹50 discount -> net ₹350)
      const draft = await salesService.createDraft(companyId, {
        customerId: testCustomerId,
        locationId: defaultLocationId,
        invoiceDate: new Date().toISOString(),
        pointsRedeemed: 50,
        pointsDiscount: 50,
        items: [
          {
            productId: testProductId,
            quantity: 2, // 2 * ₹200 = ₹400
            sellingRate: 200,
          },
        ],
      });

      // Post the sale
      const posted = await salesService.postSale(companyId, draft.id, {
        payments: [
          {
            amount: 350,
            paymentMode: 'CASH',
            paymentDate: new Date().toISOString(),
          },
        ],
      });

      expect(posted.status).toBe('POSTED');
      expect(posted.pointsRedeemed).toBe(50);
      expect(posted.pointsDiscount).toBe(50);
      // Eligible spend for points: ₹350 / 100 = 3 points earned!
      expect(posted.pointsEarned).toBe(3);

      // Verify customer wallet: started at 100 - 50 (redeemed) + 3 (earned) = 53
      const wallet = await loyaltyWalletService.getOrCreateWallet(companyId, testCustomerId);
      expect(wallet.cachedAvailablePoints).toBe(53);
    });
  });

  describe('4. Offline Batch Points Expiry Routine', () => {
    it('expires lots whose expiration date has passed', async () => {
      // Create an expired point lot manually
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      const wallet = await loyaltyWalletService.getOrCreateWallet(companyId, testCustomerId);

      const lotTxn = await prisma.loyaltyTransaction.create({
        data: {
          companyId,
          customerId: testCustomerId,
          walletId: wallet.id,
          transactionType: 'EARN',
          points: 20,
          balanceAfter: wallet.cachedAvailablePoints + 20,
          description: 'Historical promo lot',
        },
      });

      await prisma.loyaltyPointLot.create({
        data: {
          companyId,
          customerId: testCustomerId,
          walletId: wallet.id,
          sourceTransactionId: lotTxn.id,
          originalPoints: 20,
          remainingPoints: 20,
          expiresAt: pastDate,
          status: 'ACTIVE',
        },
      });

      // Update wallet balance to include those 20 pts
      await prisma.customerWallet.update({
        where: { id: wallet.id },
        data: { cachedAvailablePoints: { increment: 20 } },
      });

      // Run expiry routine
      const expiryResult = await loyaltyExpiryService.processExpiry(companyId, new Date());
      expect(expiryResult.lotsExpired).toBeGreaterThanOrEqual(1);
      expect(expiryResult.pointsExpired).toBeGreaterThanOrEqual(20);
    });
  });

  describe('5. Sales Return Points Reversal', () => {
    it('reverses earned points and restores redeemed points proportionally on return', async () => {
      // Create and post a clean sale of 3 items (₹600) earning 6 points with 0 redemption
      const draft = await salesService.createDraft(companyId, {
        customerId: testCustomerId,
        locationId: defaultLocationId,
        invoiceDate: new Date().toISOString(),
        items: [
          {
            productId: testProductId,
            quantity: 3,
            sellingRate: 200,
          },
        ],
      });

      const posted = await salesService.postSale(companyId, draft.id, {
        payments: [
          {
            amount: 600,
            paymentMode: 'CASH',
            paymentDate: new Date().toISOString(),
          },
        ],
      });

      expect(posted.pointsEarned).toBe(6);
      const preReturnWallet = await loyaltyWalletService.getOrCreateWallet(companyId, testCustomerId);

      // Return 1 item out of 3 (1/3 of the purchase)
      const postedItem = posted.items[0];
      const sReturn = await salesReturnService.createReturn(companyId, {
        originalSalesInvoiceId: posted.id,
        returnDate: new Date().toISOString(),
        refundMode: 'CASH',
        reason: 'Customer changed mind',
        items: [
          {
            salesInvoiceItemId: postedItem.id,
            productId: testProductId,
            quantity: 1,
            unitPrice: 200,
          },
        ],
      });

      expect(sReturn).toBeDefined();
      expect(sReturn.pointsReversed).toBe(2); // 6 / 3 = 2 points reversed!

      // Customer wallet balance must be reduced by 2
      const postReturnWallet = await loyaltyWalletService.getOrCreateWallet(companyId, testCustomerId);
      expect(postReturnWallet.cachedAvailablePoints).toBe(preReturnWallet.cachedAvailablePoints - 2);
    });
  });

  describe('6. Loyalty Analytics & KPIs Report', () => {
    it('aggregates total enrolled customers and estimated rupee liability', async () => {
      const kpis = await loyaltyReportService.getLoyaltyKPIs(companyId);
      expect(kpis.totalEnrolledCustomers).toBeGreaterThanOrEqual(1);
      expect(kpis.totalActivePoints).toBeGreaterThanOrEqual(0);
      expect(kpis.estimatedLiabilityAmount).toBe(kpis.totalActivePoints * 1.0);
    });

    it('generates paginated transactional audit ledger report', async () => {
      const report = await loyaltyReportService.getLoyaltyReport(companyId, {
        customerId: testCustomerId,
        pageSize: 20,
      });

      expect(report.items.length).toBeGreaterThanOrEqual(3);
      expect(report.total).toBeGreaterThanOrEqual(3);
      expect(report.items[0].customerName).toBe('Priya Sharma');
    });
  });
});
