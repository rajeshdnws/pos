// Stub services retained for backward compatibility where applicable




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
