export type PaperWidth = '58mm' | '80mm' | 'A4';

export interface PrinterConfig {
  type: 'thermal' | 'system';
  targetPrinterName?: string;
  paperWidth: PaperWidth;
  autoCut: boolean;
  openCashDrawer: boolean;
}

export interface PrintReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface PrintReceiptData {
  companyName: string;
  companyAddress?: string;
  companyGstin?: string;
  companyPhone?: string;
  invoiceNumber: string;
  date: string;
  customerName?: string;
  customerPhone?: string;
  items: PrintReceiptItem[];
  subTotal: number;
  taxAmount: number;
  discountAmount: number;
  grandTotal: number;
  paymentMode: string;
  footerMessage?: string;
}

export interface IReceiptPrinter {
  getAvailablePrinters(): Promise<string[]>;
  printReceipt(data: PrintReceiptData, config: PrinterConfig): Promise<boolean>;
}
