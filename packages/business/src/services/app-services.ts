import { ICustomerRepository } from '../repositories/interfaces.js';
import { Customer } from '@rs-inventory/types';


export class CustomerService {
  constructor(private readonly customerRepo: ICustomerRepository) {}

  public async getCustomerById(id: string): Promise<Customer | null> {
    return this.customerRepo.findById(id);
  }

  public async searchCustomers(companyId: string, query: string): Promise<Customer[]> {
    return this.customerRepo.search(companyId, query);
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
