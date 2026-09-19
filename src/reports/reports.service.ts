import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Sale, SaleDocument } from '../sales/schemas/sale.schema';
import { Purchase, PurchaseDocument } from '../purchases/schemas/purchase.schema';
import { Expense, ExpenseDocument } from '../expenses/schemas/expense.schema';
import {
  StockTransaction,
  StockTransactionDocument,
} from '../inventory/schemas/stock-transaction.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { Customer, CustomerDocument } from '../customers/schemas/customer.schema';
import { Supplier, SupplierDocument } from '../suppliers/schemas/supplier.schema';
import { BusinessSettingsService } from '../business-settings/business-settings.service';
import { DatePreset, getDateRangeFromPreset } from '../common/utils/date-range.util';
import { roundToTwoDecimals } from '../common/utils/currency.util';
import { SaleStatus, PurchaseStatus, StockTransactionType } from '../common/enums';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Sale.name)
    private readonly saleModel: Model<SaleDocument>,
    @InjectModel(Purchase.name)
    private readonly purchaseModel: Model<PurchaseDocument>,
    @InjectModel(Expense.name)
    private readonly expenseModel: Model<ExpenseDocument>,
    @InjectModel(StockTransaction.name)
    private readonly stockTransactionModel: Model<StockTransactionDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Customer.name)
    private readonly customerModel: Model<CustomerDocument>,
    @InjectModel(Supplier.name)
    private readonly supplierModel: Model<SupplierDocument>,
    private readonly settingsService: BusinessSettingsService,
  ) {}

  /**
   * Comprehensive Profit & Loss calculation:
   * Gross Sales - Sales Returns = Net Sales
   * COGS (Cost of Goods Sold based on sale-time stored cost)
   * Net Sales - COGS = Gross Profit
   * Gross Profit - Expenses = Net Operating Profit
   */
  async getProfitReport(preset?: DatePreset, customStart?: string, customEnd?: string) {
    const { startDate, endDate } = getDateRangeFromPreset(preset, customStart, customEnd);

    const [salesAgg, salesReturnsAgg, expensesAgg] = await Promise.all([
      // Sales aggregation for completed sales
      this.saleModel.aggregate([
        {
          $match: {
            status: SaleStatus.COMPLETED,
            saleDate: { $gte: startDate, $lte: endDate },
          },
        },
        { $unwind: '$items' },
        {
          $group: {
            _id: null,
            grossSales: { $sum: '$items.subtotal' },
            cogs: {
              $sum: { $multiply: ['$items.quantity', '$items.purchaseCostAtSale'] },
            },
            totalDiscount: { $first: '$discount' }, // sum discount at invoice level below
          },
        },
      ]),

      // Returns within period from stock transactions
      this.stockTransactionModel.aggregate([
        {
          $match: {
            type: StockTransactionType.SALE_RETURN,
            transactionDate: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: null,
            totalReturnAmount: {
              $sum: { $multiply: ['$quantity', '$unitCost'] },
            },
            totalReturnCogs: {
              $sum: { $multiply: ['$quantity', '$unitCost'] },
            },
          },
        },
      ]),

      // Total expenses within period
      this.expenseModel.aggregate([
        {
          $match: {
            expenseDate: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: null,
            totalExpenses: { $sum: '$amount' },
          },
        },
      ]),
    ]);

    // Also sum invoice discounts across all completed sales
    const discountsAgg = await this.saleModel.aggregate([
      {
        $match: {
          status: SaleStatus.COMPLETED,
          saleDate: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalDiscount: { $sum: '$discount' },
          totalTax: { $sum: '$tax' },
          totalGrand: { $sum: '$grandTotal' },
        },
      },
    ]);

    const grossSales = salesAgg[0]?.grossSales || 0;
    const totalDiscount = discountsAgg[0]?.totalDiscount || 0;
    const salesReturns = salesReturnsAgg[0]?.totalReturnAmount || 0;
    const netSales = roundToTwoDecimals(grossSales - totalDiscount - salesReturns);

    const baseCogs = salesAgg[0]?.cogs || 0;
    const returnedCogs = salesReturnsAgg[0]?.totalReturnCogs || 0;
    const cogs = roundToTwoDecimals(Math.max(0, baseCogs - returnedCogs));

    const grossProfit = roundToTwoDecimals(netSales - cogs);
    const totalExpenses = roundToTwoDecimals(expensesAgg[0]?.totalExpenses || 0);
    const netOperatingProfit = roundToTwoDecimals(grossProfit - totalExpenses);

    const grossProfitMargin = netSales > 0 ? roundToTwoDecimals((grossProfit / netSales) * 100) : 0;
    const netProfitMargin =
      netSales > 0 ? roundToTwoDecimals((netOperatingProfit / netSales) * 100) : 0;

    return {
      period: { startDate, endDate, preset: preset || 'thisMonth' },
      revenue: {
        grossSales: roundToTwoDecimals(grossSales),
        discounts: roundToTwoDecimals(totalDiscount),
        salesReturns: roundToTwoDecimals(salesReturns),
        netSales,
      },
      costOfGoodsSold: cogs,
      grossProfit,
      grossProfitMargin: `${grossProfitMargin}%`,
      operatingExpenses: totalExpenses,
      netOperatingProfit,
      netProfitMargin: `${netProfitMargin}%`,
    };
  }

  /**
   * Product performance report (Top selling and top profitable)
   */
  async getProductPerformance(
    preset?: DatePreset,
    customStart?: string,
    customEnd?: string,
    limit = 10,
  ) {
    const { startDate, endDate } = getDateRangeFromPreset(preset, customStart, customEnd);

    const result = await this.saleModel.aggregate([
      {
        $match: {
          status: SaleStatus.COMPLETED,
          saleDate: { $gte: startDate, $lte: endDate },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.productName' },
          sku: { $first: '$items.productSku' },
          unitsSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' },
          totalProfit: { $sum: '$items.profit' },
        },
      },
      {
        $project: {
          productId: '$_id',
          name: 1,
          sku: 1,
          unitsSold: 1,
          totalRevenue: { $round: ['$totalRevenue', 2] },
          totalProfit: { $round: ['$totalProfit', 2] },
        },
      },
      { $sort: { unitsSold: -1 } },
      { $limit: limit },
    ]);

    return result;
  }

  /**
   * Category performance report
   */
  async getCategoryPerformance(preset?: DatePreset, customStart?: string, customEnd?: string) {
    const { startDate, endDate } = getDateRangeFromPreset(preset, customStart, customEnd);

    const result = await this.saleModel.aggregate([
      {
        $match: {
          status: SaleStatus.COMPLETED,
          saleDate: { $gte: startDate, $lte: endDate },
        },
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productDetails',
        },
      },
      { $unwind: '$productDetails' },
      {
        $lookup: {
          from: 'categories',
          localField: 'productDetails.category',
          foreignField: '_id',
          as: 'catDetails',
        },
      },
      { $unwind: '$catDetails' },
      {
        $group: {
          _id: '$catDetails._id',
          categoryName: { $first: '$catDetails.name' },
          unitsSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' },
          totalProfit: { $sum: '$items.profit' },
        },
      },
      {
        $project: {
          categoryId: '$_id',
          categoryName: 1,
          unitsSold: 1,
          totalRevenue: { $round: ['$totalRevenue', 2] },
          totalProfit: { $round: ['$totalProfit', 2] },
        },
      },
      { $sort: { totalRevenue: -1 } },
    ]);

    return result;
  }

  /**
   * Dedicated Monthly Business Report with day-by-day datasets for charts
   */
  async getMonthlyBusinessReport(year: number, month: number) {
    // month is 1-indexed (1 = Jan, 12 = Dec)
    const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    const daysInMonth = endDate.getDate();

    const [
      profitSummary,
      topProducts,
      topCategories,
      dailySalesAgg,
      dailyPurchasesAgg,
      dailyExpensesAgg,
    ] = await Promise.all([
      this.getProfitReport('custom', startDate.toISOString(), endDate.toISOString()),
      this.getProductPerformance('custom', startDate.toISOString(), endDate.toISOString(), 5),
      this.getCategoryPerformance('custom', startDate.toISOString(), endDate.toISOString()),

      // Daily sales breakdown
      this.saleModel.aggregate([
        {
          $match: {
            status: SaleStatus.COMPLETED,
            saleDate: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: { $dayOfMonth: '$saleDate' },
            totalSales: { $sum: '$grandTotal' },
            totalProfit: { $sum: '$totalProfit' },
            unitsSold: { $sum: { $sum: '$items.quantity' } },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Daily purchases breakdown
      this.purchaseModel.aggregate([
        {
          $match: {
            status: PurchaseStatus.COMPLETED,
            purchaseDate: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: { $dayOfMonth: '$purchaseDate' },
            totalPurchases: { $sum: '$grandTotal' },
            unitsPurchased: { $sum: { $sum: '$items.quantity' } },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Daily expenses breakdown
      this.expenseModel.aggregate([
        {
          $match: {
            expenseDate: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: { $dayOfMonth: '$expenseDate' },
            totalExpenses: { $sum: '$amount' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    // Format chart ready daily datasets: 1 to daysInMonth
    const dailyData = [];
    const salesMap = new Map(dailySalesAgg.map((s) => [s._id, s]));
    const purchasesMap = new Map(dailyPurchasesAgg.map((p) => [p._id, p]));
    const expensesMap = new Map(dailyExpensesAgg.map((e) => [e._id, e]));

    for (let day = 1; day <= daysInMonth; day++) {
      const s = salesMap.get(day);
      const p = purchasesMap.get(day);
      const e = expensesMap.get(day);

      dailyData.push({
        day,
        date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        sales: roundToTwoDecimals(s?.totalSales || 0),
        profit: roundToTwoDecimals(s?.totalProfit || 0),
        purchases: roundToTwoDecimals(p?.totalPurchases || 0),
        expenses: roundToTwoDecimals(e?.totalExpenses || 0),
        unitsSold: s?.unitsSold || 0,
      });
    }

    // Customer receivable and supplier payable snapshot
    const [receivableAgg, payableAgg] = await Promise.all([
      this.customerModel.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, total: { $sum: '$currentReceivable' } } },
      ]),
      this.supplierModel.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, total: { $sum: '$currentPayable' } } },
      ]),
    ]);

    return {
      month: { year, month, daysInMonth, startDate, endDate },
      financialSummary: profitSummary,
      ledgerSummary: {
        customerReceivable: roundToTwoDecimals(receivableAgg[0]?.total || 0),
        supplierPayable: roundToTwoDecimals(payableAgg[0]?.total || 0),
      },
      dailyChartData: dailyData,
      dailyBreakdown: dailyData,
      topSellingProducts: topProducts,
      topCategories,
    };
  }
}
