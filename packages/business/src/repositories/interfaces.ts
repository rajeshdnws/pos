import { Company, Customer, Product, StockMovement, Supplier, User } from '@rs-inventory/types';

export interface IBaseRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(filter?: Record<string, unknown>): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
}

export interface IProductRepository extends IBaseRepository<Product> {
  findBySku(companyId: string, sku: string): Promise<Product | null>;
  findByBarcode(companyId: string, barcode: string): Promise<Product | null>;
  search(companyId: string, query: string): Promise<Product[]>;
  updateStock(productId: string, quantityDelta: number): Promise<Product>;
}

export interface ICustomerRepository extends IBaseRepository<Customer> {
  findByPhone(companyId: string, phone: string): Promise<Customer | null>;
  search(companyId: string, query: string): Promise<Customer[]>;
  updateBalance(customerId: string, balanceDelta: number): Promise<Customer>;
}

export interface ISupplierRepository extends IBaseRepository<Supplier> {
  findByPhone(companyId: string, phone: string): Promise<Supplier | null>;
  search(companyId: string, query: string): Promise<Supplier[]>;
  updateBalance(supplierId: string, balanceDelta: number): Promise<Supplier>;
}

export interface ISalesRepository {
  findById(id: string): Promise<unknown | null>;
  findAll(companyId: string, filter?: Record<string, unknown>): Promise<unknown[]>;
  generateInvoiceNumber(companyId: string): Promise<string>;
  createInvoice(data: unknown): Promise<unknown>;
  createReturn(data: unknown): Promise<unknown>;
}

export interface IPurchaseRepository {
  findById(id: string): Promise<unknown | null>;
  findAll(companyId: string, filter?: Record<string, unknown>): Promise<unknown[]>;
  generatePurchaseNumber(companyId: string): Promise<string>;
  createPurchase(data: unknown): Promise<unknown>;
  createReturn(data: unknown): Promise<unknown>;
}

export interface IStockRepository {
  recordMovement(data: Partial<StockMovement>): Promise<StockMovement>;
  getMovementsByProduct(productId: string, limit?: number): Promise<StockMovement[]>;
  getLowStockProducts(companyId: string): Promise<Product[]>;
}

export interface ICompanyRepository extends IBaseRepository<Company> {
  getActiveCompany(): Promise<Company | null>;
}

export interface IUserRepository extends IBaseRepository<User> {
  findByUsername(username: string): Promise<User | null>;
  updateLastLogin(userId: string): Promise<void>;
}
