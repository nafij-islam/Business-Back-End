import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { Sale, SaleDocument } from '../sales/schemas/sale.schema';
import { Purchase, PurchaseDocument } from '../purchases/schemas/purchase.schema';
import { Customer, CustomerDocument } from '../customers/schemas/customer.schema';
import { Supplier, SupplierDocument } from '../suppliers/schemas/supplier.schema';
import { Expense, ExpenseDocument } from '../expenses/schemas/expense.schema';

@Injectable()
export class ExportService {
  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(Sale.name) private readonly saleModel: Model<SaleDocument>,
    @InjectModel(Purchase.name) private readonly purchaseModel: Model<PurchaseDocument>,
    @InjectModel(Customer.name) private readonly customerModel: Model<CustomerDocument>,
    @InjectModel(Supplier.name) private readonly supplierModel: Model<SupplierDocument>,
    @InjectModel(Expense.name) private readonly expenseModel: Model<ExpenseDocument>,
  ) {}

  async exportInventory(format: 'json' | 'csv' = 'json') {
    const products = await this.productModel
      .find({ isArchived: false })
      .populate('category', 'name')
      .populate('brand', 'name')
      .populate('unit', 'name shortName')
      .lean()
      .exec();

    const flattened = products.map((p) => ({
      name: p.name,
      SKU: p.SKU,
      barcode: p.barcode || '',
      category: (p.category as any)?.name || '',
      brand: (p.brand as any)?.name || '',
      unit: (p.unit as any)?.name || '',
      currentStock: p.currentStock,
      purchasePrice: p.purchasePrice,
      sellingPrice: p.sellingPrice,
      totalPurchaseValue: p.currentStock * p.purchasePrice,
      totalSellingValue: p.currentStock * p.sellingPrice,
    }));

    if (format === 'csv') {
      return this.toCsv(flattened);
    }
    return flattened;
  }

  async exportSales(format: 'json' | 'csv' = 'json') {
    const sales = await this.saleModel
      .find()
      .populate('customer', 'name phone')
      .sort({ saleDate: -1 })
      .lean()
      .exec();

    const flattened = sales.map((s) => ({
      saleNumber: s.saleNumber,
      saleDate: s.saleDate.toISOString().slice(0, 10),
      customer: (s.customer as any)?.name || 'Guest / Walk-in',
      subtotal: s.subtotal,
      discount: s.discount,
      tax: s.tax,
      grandTotal: s.grandTotal,
      paidAmount: s.paidAmount,
      dueAmount: s.dueAmount,
      totalProfit: s.totalProfit,
      paymentStatus: s.paymentStatus,
      status: s.status,
    }));

    if (format === 'csv') {
      return this.toCsv(flattened);
    }
    return flattened;
  }

  async exportPurchases(format: 'json' | 'csv' = 'json') {
    const purchases = await this.purchaseModel
      .find()
      .populate('supplier', 'name companyName')
      .sort({ purchaseDate: -1 })
      .lean()
      .exec();

    const flattened = purchases.map((p) => ({
      purchaseNumber: p.purchaseNumber,
      purchaseDate: p.purchaseDate.toISOString().slice(0, 10),
      supplier: (p.supplier as any)?.name || '',
      grandTotal: p.grandTotal,
      paidAmount: p.paidAmount,
      dueAmount: p.dueAmount,
      paymentStatus: p.paymentStatus,
      status: p.status,
    }));

    if (format === 'csv') {
      return this.toCsv(flattened);
    }
    return flattened;
  }

  async exportCustomers(format: 'json' | 'csv' = 'json') {
    const customers = await this.customerModel.find({ isActive: true }).lean().exec();
    const flattened = customers.map((c) => ({
      name: c.name,
      phone: c.phone,
      email: c.email || '',
      address: c.address || '',
      currentReceivable: c.currentReceivable,
    }));

    if (format === 'csv') {
      return this.toCsv(flattened);
    }
    return flattened;
  }

  async exportSuppliers(format: 'json' | 'csv' = 'json') {
    const suppliers = await this.supplierModel.find({ isActive: true }).lean().exec();
    const flattened = suppliers.map((s) => ({
      name: s.name,
      companyName: s.companyName || '',
      phone: s.phone,
      email: s.email || '',
      address: s.address || '',
      currentPayable: s.currentPayable,
    }));

    if (format === 'csv') {
      return this.toCsv(flattened);
    }
    return flattened;
  }

  private toCsv(rows: Record<string, any>[]): string {
    if (rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const csvRows = [headers.join(',')];

    for (const row of rows) {
      const values = headers.map((header) => {
        const val = row[header];
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }
}
