import {
  ICustomerRepository,
  IProductRepository,
  IPurchaseRepository,
  ISalesRepository,
  IStockRepository,
  ISupplierRepository,
} from '../repositories/interfaces.js';
import { Customer, Product, Supplier } from '@rs-inventory/types';

export class ProductService {
  constructor(private readonly productRepo: IProductRepository) {}

  public async getProductById(id: string): Promise<Product | null> {
    return this.productRepo.findById(id);
  }

  public async searchProducts(companyId: string, query: string): Promise<Product[]> {
    return this.productRepo.search(companyId, query);
  }
}

export class CustomerService {
  constructor(private readonly customerRepo: ICustomerRepository) {}

  public async getCustomerById(id: string): Promise<Customer | null> {
    return this.customerRepo.findById(id);
  }

  public async searchCustomers(companyId: string, query: string): Promise<Customer[]> {
    return this.customerRepo.search(companyId, query);
  }
}

export class SupplierService {
  constructor(private readonly supplierRepo: ISupplierRepository) {}

  public async getSupplierById(id: string): Promise<Supplier | null> {
    return this.supplierRepo.findById(id);
  }

  public async searchSuppliers(companyId: string, query: string): Promise<Supplier[]> {
    return this.supplierRepo.search(companyId, query);
  }
}

export class SalesService {
  constructor(
    private readonly salesRepo: ISalesRepository,
    private readonly stockRepo: IStockRepository,
  ) {}

  public async getInvoiceById(id: string): Promise<unknown | null> {
    return this.salesRepo.findById(id);
  }

  public getStockRepository(): IStockRepository {
    return this.stockRepo;
  }
}

export class PurchaseService {
  constructor(
    private readonly purchaseRepo: IPurchaseRepository,
    private readonly stockRepo: IStockRepository,
  ) {}

  public async getPurchaseById(id: string): Promise<unknown | null> {
    return this.purchaseRepo.findById(id);
  }

  public getStockRepository(): IStockRepository {
    return this.stockRepo;
  }
}

export class StockService {
  constructor(private readonly stockRepo: IStockRepository) {}

  public async getLowStockAlerts(companyId: string): Promise<Product[]> {
    return this.stockRepo.getLowStockProducts(companyId);
  }
}

export class PaymentService {
  public async recordCustomerPayment(_paymentData: unknown): Promise<{ id: string }> {
    return { id: 'stub-payment-id' };
  }

  public async recordSupplierPayment(_paymentData: unknown): Promise<{ id: string }> {
    return { id: 'stub-payment-id' };
  }
}

export class ReportService {
  public async generateDailySummary(
    companyId: string,
    date: Date,
  ): Promise<Record<string, unknown>> {
    return {
      companyId,
      date: date.toISOString(),
      totalSales: 0,
      totalPurchases: 0,
      totalReceipts: 0,
    };
  }
}
