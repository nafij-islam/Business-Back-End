import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Sale, SaleDocument } from '../sales/schemas/sale.schema';
import { Purchase, PurchaseDocument } from '../purchases/schemas/purchase.schema';
import { Expense, ExpenseDocument } from '../expenses/schemas/expense.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { Category, CategoryDocument } from '../categories/schemas/category.schema';
import { Supplier, SupplierDocument } from '../suppliers/schemas/supplier.schema';
import { Customer, CustomerDocument } from '../customers/schemas/customer.schema';
import {
  StockTransaction,
  StockTransactionDocument,
} from '../inventory/schemas/stock-transaction.schema';
import { BusinessSettingsService } from '../business-settings/business-settings.service';
import { InventoryService } from '../inventory/inventory.service';
import { roundToTwoDecimals, calculatePercentageChange } from '../common/utils/currency.util';
import { SaleStatus, PurchaseStatus } from '../common/enums';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(Sale.name)
    private readonly saleModel: Model<SaleDocument>,
    @InjectModel(Purchase.name)
    private readonly purchaseModel: Model<PurchaseDocument>,
    @InjectModel(Expense.name)
    private readonly expenseModel: Model<ExpenseDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(Supplier.name)
    private readonly supplierModel: Model<SupplierDocument>,
    @InjectModel(Customer.name)
    private readonly customerModel: Model<CustomerDocument>,
    @InjectModel(StockTransaction.name)
    private readonly stockTransactionModel: Model<StockTransactionDocument>,
    private readonly inventoryService: InventoryService,
    private readonly settingsService: BusinessSettingsService,
  ) {}

  async getDashboardSummary() {
    const now = new Date();

    // Today's range
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // This month's range
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // 30 days ago
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const [
      todaySalesAgg,
      todayPurchasesAgg,
      todayExpensesAgg,
      monthSalesAgg,
      monthPurchasesAgg,
      monthExpensesAgg,
      valuation,
      counts,
      stockAlerts,
      receivableAgg,
      payableAgg,
      recentSales,
      recentPurchases,
      recentStockActivity,
      chartData,
    ] = await Promise.all([
      // Today Sales
      this.saleModel.aggregate([
        {
          $match: {
            status: SaleStatus.COMPLETED,
            saleDate: { $gte: startOfToday, $lte: endOfToday },
          },
        },
        { $group: { _id: null, total: { $sum: '$grandTotal' }, profit: { $sum: '$totalProfit' } } },
      ]),
      // Today Purchases
      this.purchaseModel.aggregate([
        {
          $match: {
            status: PurchaseStatus.COMPLETED,
            purchaseDate: { $gte: startOfToday, $lte: endOfToday },
          },
        },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } },
      ]),
      // Today Expenses
      this.expenseModel.aggregate([
        { $match: { expenseDate: { $gte: startOfToday, $lte: endOfToday } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      // Month Sales
      this.saleModel.aggregate([
        {
          $match: {
            status: SaleStatus.COMPLETED,
            saleDate: { $gte: startOfMonth, $lte: endOfMonth },
          },
        },
        { $group: { _id: null, total: { $sum: '$grandTotal' }, profit: { $sum: '$totalProfit' } } },
      ]),
      // Month Purchases
      this.purchaseModel.aggregate([
        {
          $match: {
            status: PurchaseStatus.COMPLETED,
            purchaseDate: { $gte: startOfMonth, $lte: endOfMonth },
          },
        },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } },
      ]),
      // Month Expenses
      this.expenseModel.aggregate([
        { $match: { expenseDate: { $gte: startOfMonth, $lte: endOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      // Inventory Valuation
      this.inventoryService.getValuationSummary(),
      // Directory Entity Counts
      Promise.all([
        this.productModel.countDocuments({ isArchived: false }),
        this.categoryModel.countDocuments({ isActive: true }),
        this.supplierModel.countDocuments({ isActive: true }),
        this.customerModel.countDocuments({ isActive: true }),
      ]),
      // Stock Alerts
      this.inventoryService.getLowStockAlerts(),
      // Receivable
      this.customerModel.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, total: { $sum: '$currentReceivable' } } },
      ]),
      // Payable
      this.supplierModel.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, total: { $sum: '$currentPayable' } } },
      ]),
      // Recent Sales
      this.saleModel
        .find({ status: SaleStatus.COMPLETED })
        .populate('customer', 'name phone')
        .sort({ saleDate: -1 })
        .limit(5)
        .lean()
        .exec(),
      // Recent Purchases
      this.purchaseModel
        .find({ status: PurchaseStatus.COMPLETED })
        .populate('supplier', 'name companyName')
        .sort({ purchaseDate: -1 })
        .limit(5)
        .lean()
        .exec(),
      // Recent Stock Activity
      this.stockTransactionModel
        .find()
        .populate('product', 'name SKU unit')
        .sort({ transactionDate: -1 })
        .limit(5)
        .lean()
        .exec(),
      // 30-day Chart Data
      this.getThirtyDayChartData(thirtyDaysAgo, endOfToday),
    ]);

    const todayProfit = roundToTwoDecimals(
      (todaySalesAgg[0]?.profit || 0) - (todayExpensesAgg[0]?.total || 0),
    );
    const monthGrossProfit = roundToTwoDecimals(monthSalesAgg[0]?.profit || 0);
    const monthNetProfit = roundToTwoDecimals(monthGrossProfit - (monthExpensesAgg[0]?.total || 0));

    return {
      today: {
        sales: roundToTwoDecimals(todaySalesAgg[0]?.total || 0),
        purchases: roundToTwoDecimals(todayPurchasesAgg[0]?.total || 0),
        expenses: roundToTwoDecimals(todayExpensesAgg[0]?.total || 0),
        netProfit: todayProfit,
      },
      thisMonth: {
        sales: roundToTwoDecimals(monthSalesAgg[0]?.total || 0),
        purchases: roundToTwoDecimals(monthPurchasesAgg[0]?.total || 0),
        expenses: roundToTwoDecimals(monthExpensesAgg[0]?.total || 0),
        grossProfit: monthGrossProfit,
        netProfit: monthNetProfit,
      },
      inventory: {
        purchaseValue: valuation.totalPurchaseValue,
        potentialSellingValue: valuation.totalPotentialSellingValue,
        totalStockQuantity: valuation.totalStockQuantity,
        lowStockCount: stockAlerts.lowStockCount,
        outOfStockCount: stockAlerts.outOfStockCount,
      },
      counts: {
        totalProducts: counts[0],
        totalCategories: counts[1],
        totalSuppliers: counts[2],
        totalCustomers: counts[3],
      },
      ledger: {
        customerReceivable: roundToTwoDecimals(receivableAgg[0]?.total || 0),
        supplierPayable: roundToTwoDecimals(payableAgg[0]?.total || 0),
      },
      recent: {
        sales: recentSales,
        purchases: recentPurchases,
        stockActivity: recentStockActivity,
      },
      chartData,
    };
  }

  async getHealthMetrics() {
    const now = new Date();
    // Last 30 days vs Previous 30 days
    const currentStart = new Date(now);
    currentStart.setDate(currentStart.getDate() - 29);
    currentStart.setHours(0, 0, 0, 0);

    const prevStart = new Date(currentStart);
    prevStart.setDate(prevStart.getDate() - 30);
    const prevEnd = new Date(currentStart);
    prevEnd.setMilliseconds(-1);

    const [curSales, prevSales, curExp, prevExp, totalProducts, alerts] = await Promise.all([
      this.saleModel.aggregate([
        { $match: { status: SaleStatus.COMPLETED, saleDate: { $gte: currentStart, $lte: now } } },
        { $group: { _id: null, sales: { $sum: '$grandTotal' }, profit: { $sum: '$totalProfit' } } },
      ]),
      this.saleModel.aggregate([
        { $match: { status: SaleStatus.COMPLETED, saleDate: { $gte: prevStart, $lte: prevEnd } } },
        { $group: { _id: null, sales: { $sum: '$grandTotal' }, profit: { $sum: '$totalProfit' } } },
      ]),
      this.expenseModel.aggregate([
        { $match: { expenseDate: { $gte: currentStart, $lte: now } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      this.expenseModel.aggregate([
        { $match: { expenseDate: { $gte: prevStart, $lte: prevEnd } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      this.productModel.countDocuments({ isArchived: false }),
      this.inventoryService.getLowStockAlerts(),
    ]);

    const curSalesVal = curSales[0]?.sales || 0;
    const prevSalesVal = prevSales[0]?.sales || 0;
    const curProfitVal = curSales[0]?.profit || 0;
    const prevProfitVal = prevSales[0]?.profit || 0;
    const curExpVal = curExp[0]?.total || 0;
    const prevExpVal = prevExp[0]?.total || 0;

    const lowStockRatio =
      totalProducts > 0 ? roundToTwoDecimals((alerts.lowStockCount / totalProducts) * 100) : 0;

    return {
      salesChangePercent: calculatePercentageChange(curSalesVal, prevSalesVal),
      profitChangePercent: calculatePercentageChange(curProfitVal, prevProfitVal),
      expenseChangePercent: calculatePercentageChange(curExpVal, prevExpVal),
      lowStockRatio: `${lowStockRatio}%`,
      outOfStockCount: alerts.outOfStockCount,
      inventoryStatus:
        alerts.outOfStockCount === 0 && alerts.lowStockCount === 0
          ? 'HEALTHY'
          : 'ATTENTION_REQUIRED',
    };
  }

  private async getThirtyDayChartData(startDate: Date, endDate: Date) {
    const [salesAgg, purchasesAgg, expensesAgg] = await Promise.all([
      this.saleModel.aggregate([
        { $match: { status: SaleStatus.COMPLETED, saleDate: { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$saleDate' } },
            sales: { $sum: '$grandTotal' },
            profit: { $sum: '$totalProfit' },
          },
        },
      ]),
      this.purchaseModel.aggregate([
        {
          $match: {
            status: PurchaseStatus.COMPLETED,
            purchaseDate: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$purchaseDate' } },
            purchases: { $sum: '$grandTotal' },
          },
        },
      ]),
      this.expenseModel.aggregate([
        { $match: { expenseDate: { $gte: startDate, $lte: endDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$expenseDate' } },
            expenses: { $sum: '$amount' },
          },
        },
      ]),
    ]);

    const salesMap = new Map(salesAgg.map((s) => [s._id, s]));
    const purchasesMap = new Map(purchasesAgg.map((p) => [p._id, p]));
    const expensesMap = new Map(expensesAgg.map((e) => [e._id, e]));

    const chartDays = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const dateStr = current.toISOString().slice(0, 10);
      const s = salesMap.get(dateStr);
      const p = purchasesMap.get(dateStr);
      const e = expensesMap.get(dateStr);

      chartDays.push({
        date: dateStr,
        sales: roundToTwoDecimals(s?.sales || 0),
        profit: roundToTwoDecimals(s?.profit || 0),
        purchases: roundToTwoDecimals(p?.purchases || 0),
        expenses: roundToTwoDecimals(e?.expenses || 0),
      });

      current.setDate(current.getDate() + 1);
    }

    return chartDays;
  }
}
