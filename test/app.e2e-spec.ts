import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { APP_CONSTANTS } from '../src/common/constants/app.constants';
import { UsersService } from '../src/users/users.service';
import { Role } from '../src/common/enums';
import { stopInMemoryReplSet } from '../src/database/database.module';

describe('Business Management API (E2E Full Verification)', () => {
  let app: INestApplication;
  let usersService: UsersService;
  let authToken: string;
  let adminUserId: string;

  // Tracked IDs across tests
  let categoryId: string;
  let brandId: string;
  let unitId: string;
  let productId: string;
  let customerId: string;
  let supplierId: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.USE_MEMORY_DB = 'true';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix(APP_CONSTANTS.API_PREFIX, { exclude: ['health'] });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new TransformInterceptor());

    await app.init();

    usersService = app.get(UsersService);

    // Bootstrap test administrator
    const admin = await usersService.create({
      firstName: 'Lead',
      lastName: 'Architect',
      email: 'admin.e2e@apexenterprise.com',
      password: 'AdminPassword123!',
      role: Role.OWNER,
    });
    adminUserId = admin._id.toString();
  }, 60000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await stopInMemoryReplSet();
  });

  // 1. Health Endpoint
  it('GET /health - should return healthy status', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.services.database).toBe('connected');
  });

  // 2. Authentication Flow
  it('POST /api/v1/auth/login - should authenticate and return tokens', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin.e2e@apexenterprise.com',
        password: 'AdminPassword123!',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data.user.email).toBe('admin.e2e@apexenterprise.com');
    expect(res.headers['set-cookie']).toBeDefined();

    authToken = res.body.data.accessToken;
  });

  it('GET /api/v1/auth/me - should return authenticated admin profile', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('admin.e2e@apexenterprise.com');
    expect(res.body.data.role).toBe(Role.OWNER);
    expect(res.body.data.id).toBe(adminUserId);
  });

  // 3. Business Settings & Dynamic Branding
  it('GET & PATCH /api/v1/settings - should fetch and update branding colors', async () => {
    const getRes = await request(app.getHttpServer()).get('/api/v1/settings').expect(200);
    expect(getRes.body.success).toBe(true);
    expect(getRes.body.data.branding.primaryColor).toBe('#0d9488');

    const patchRes = await request(app.getHttpServer())
      .patch('/api/v1/settings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        branding: {
          primaryColor: '#059669',
          sidebarColor: '#020617',
        },
      })
      .expect(200);

    expect(patchRes.body.success).toBe(true);
    expect(patchRes.body.data.branding.primaryColor).toBe('#059669');
    expect(patchRes.body.data.branding.sidebarColor).toBe('#020617');
  });

  // 4. Setup Entities: Category, Brand, Unit, Customer, Supplier
  it('POST /api/v1/categories - create Category', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Computer Accessories',
        description: 'Peripherals and input devices',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    categoryId = res.body.data._id;
  });

  it('POST /api/v1/brands - create Brand', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/brands')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Logitech',
        description: 'Swiss manufacturer of computer peripherals',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    brandId = res.body.data._id;
  });

  it('POST /api/v1/units - create Unit', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/units')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Piece',
        shortName: 'pc',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    unitId = res.body.data._id;
  });

  it('POST /api/v1/customers - create Customer', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Alice Cooper',
        phone: '+1 555-401-2831',
        email: 'alice@example.com',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    customerId = res.body.data._id;
  });

  it('POST /api/v1/suppliers - create Supplier', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/suppliers')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Tech Distributor Inc',
        phone: '+1 555-881-9920',
        email: 'sales@techdist.com',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    supplierId = res.body.data._id;
  });

  // 5. Product Creation with Opening Stock: 20
  it('POST /api/v1/products - create Product with Opening Stock 20', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Logitech Mouse',
        SKU: 'LOG-M90-BLK',
        category: categoryId,
        brand: brandId,
        unit: unitId,
        purchasePrice: 10.0,
        sellingPrice: 18.0,
        openingStock: 20,
        lowStockThreshold: 5,
        customAttributes: { DPI: 1000, Color: 'Black', Connectivity: 'USB Wired' },
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.currentStock).toBe(20);
    productId = res.body.data._id;
  });

  it('POST /api/v1/products - reject duplicate SKU', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Duplicate Mouse',
        SKU: 'LOG-M90-BLK',
        category: categoryId,
        unit: unitId,
        purchasePrice: 12.0,
        sellingPrice: 20.0,
      })
      .expect(409);

    expect(res.body.success).toBe(false);
  });

  // 6. Execute Specified Stock Flow:
  // Initial = 20
  // Stock In: 50 -> Expected = 70
  // Sale: 10 -> Expected = 60
  // Damage: 3 -> Expected = 57
  it('Stock Flow: Stock In +50 -> Current Stock = 70', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/inventory/stock-in')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        product: productId,
        quantity: 50,
        unitCost: 10.0,
        note: 'Shipment batch 1',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.product.currentStock).toBe(70);
    expect(res.body.data.transaction.previousStock).toBe(20);
    expect(res.body.data.transaction.newStock).toBe(70);
  });

  it('Stock Flow: Sale -10 -> Current Stock = 60 & Correct Profit', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/sales')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        customer: customerId,
        items: [
          {
            product: productId,
            quantity: 10,
            sellingPrice: 18.0,
          },
        ],
        paidAmount: 180.0,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.grandTotal).toBe(180.0);
    // Profit = (18.0 selling - 10.0 purchaseCostAtSale) * 10 = 80.0
    expect(res.body.data.totalProfit).toBe(80.0);
    expect(res.body.data.items[0].purchaseCostAtSale).toBe(10.0);

    // Verify stock is now 60
    const prodRes = await request(app.getHttpServer())
      .get(`/api/v1/products/${productId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(prodRes.body.data.currentStock).toBe(60);
  });

  it('Stock Flow: Damage (Stock Out) -3 -> Current Stock = 57', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/inventory/stock-out')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        product: productId,
        quantity: 3,
        reason: 'DAMAGE',
        note: 'Damaged in storage rack fall',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.product.currentStock).toBe(57);
    expect(res.body.data.transaction.previousStock).toBe(60);
    expect(res.body.data.transaction.newStock).toBe(57);
  });

  // Purchase Test using supplierId
  it('POST /api/v1/purchases - should create purchase order and increment stock', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/purchases')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        supplier: supplierId,
        items: [
          {
            product: productId,
            quantity: 10,
            unitCost: 10.0,
          },
        ],
        paidAmount: 50.0, // Partial payment
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.grandTotal).toBe(100.0);
    expect(res.body.data.dueAmount).toBe(50.0);

    // Stock should now be 57 + 10 = 67
    const prodRes = await request(app.getHttpServer())
      .get(`/api/v1/products/${productId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(prodRes.body.data.currentStock).toBe(67);
  });

  // 7. Verify Negative Stock Prevention
  it('Stock Out: should reject transaction causing negative stock when allowNegativeStock is false', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/inventory/stock-out')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        product: productId,
        quantity: 100, // current is 57
        reason: 'SALE',
      })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Insufficient stock');
  });

  // 8. Verify Immutable Stock Movement Audit Trail
  it('GET /api/v1/inventory/transactions - should verify all stock movements in audit history', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/inventory/transactions?product=${productId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    const types = res.body.data.map((t: any) => t.type);
    expect(types).toContain('OPENING_STOCK');
    expect(types).toContain('STOCK_IN');
    expect(types).toContain('SALE');
    expect(types).toContain('DAMAGE');
  });

  // 9. Expenses
  it('POST /api/v1/expenses - should record an operating expense', async () => {
    const categoriesRes = await request(app.getHttpServer())
      .get('/api/v1/expenses/categories')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const rentCat = categoriesRes.body.data.find((c: any) => c.name === 'Rent');

    const res = await request(app.getHttpServer())
      .post('/api/v1/expenses')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        category: rentCat._id,
        amount: 30.0,
        note: 'Part of shop rent',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.amount).toBe(30.0);
  });

  // 10. Reports & Analytics
  it('GET /api/v1/reports/profit - verify Net Sales, COGS, Gross Profit, Operating Expenses, Net Profit', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/reports/profit')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    const report = res.body.data;
    // Net sales: 180.0
    expect(report.revenue.netSales).toBe(180.0);
    // COGS: 10 items * $10 = 100.0
    expect(report.costOfGoodsSold).toBe(100.0);
    // Gross Profit: 180 - 100 = 80.0
    expect(report.grossProfit).toBe(80.0);
    // Operating Expenses: 30.0
    expect(report.operatingExpenses).toBe(30.0);
    // Net Operating Profit: 80 - 30 = 50.0
    expect(report.netOperatingProfit).toBe(50.0);
  });

  // 11. Dashboard Consolidated Summary
  it('GET /api/v1/dashboard/summary - should return all metrics in a single fast call', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/dashboard/summary')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    const summary = res.body.data;
    expect(summary.today.sales).toBe(180.0);
    expect(summary.counts.totalProducts).toBeGreaterThanOrEqual(1);
    expect(summary.counts.totalCategories).toBeGreaterThanOrEqual(1);
    expect(summary.counts.totalCustomers).toBeGreaterThanOrEqual(1);
    expect(summary.counts.totalSuppliers).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(summary.chartData)).toBe(true);
  });

  // 12. Health Metrics
  it('GET /api/v1/dashboard/health-metrics - should report business health and ratios', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/dashboard/health-metrics')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('salesChangePercent');
    expect(res.body.data).toHaveProperty('lowStockRatio');
    expect(res.body.data).toHaveProperty('inventoryStatus');
  });

  // 13. Audit Log Verification
  it('GET /api/v1/audit-logs - should contain audit records for product, stock, and sales', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/audit-logs')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
