# Apex Business Management System - Backend API

Production-grade, high-performance, strictly typed backend for private business inventory, sales, purchases, expenses, profit calculation, and analytical reporting.

---

## 1. Architectural Highlights

- **Private Single-Business Deployment**: Designed specifically for cloneable single-business installations. Each client receives their own database, admin account, domain, and branding without multi-tenant overhead.
- **ACID Transaction Engine**: All inventory mutations (Stock-In, Stock-Out, Adjustments, Purchases, Sales, Returns) are strictly executed using MongoDB sessions/transactions with an immutable `StockTransaction` audit trail. Zero silent stock drift.
- **Accurate Historical Cost Basis**: Preserves `purchaseCostAtSale` on each sale line item so historical profit calculations remain 100% accurate regardless of subsequent product cost or price updates.
- **Optimized Aggregations**: Date-filtered reports (Profit & Loss, Monthly Business Report, Product & Category rankings) run directly inside MongoDB aggregation pipelines without loading large datasets into Node.js memory.
- **Dynamic White-Label Customization**: Singleton `BusinessSettings` controls business branding (colors, logos), currency, timezones, and module toggles without code changes.
- **Enterprise Security**: Argon2/Bcrypt password hashing, short-lived JWT access tokens with secure HttpOnly refresh token rotation, Helmet security headers, rate limiting (Throttler), and centralized sanitization filters.

---

## 2. Requirements

- **Node.js**: `v20.x` or `v22.x` or `v24.x` (tested on Node.js v24.16.0)
- **Package Manager**: `pnpm` (v9+ or v12+)
- **Database**: MongoDB v6.0+ (local instance or MongoDB Atlas). Built-in replica set memory server fallback is included for seamless local development and tests.

---

## 3. Environment Variables

Create a `.env` file in the root of `back-End/` (refer to `.env.example`):

```bash
# Application
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb://127.0.0.1:27017/business_inventory

# Frontend URL & CORS
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000

# Authentication (generate via: openssl rand -base64 32)
JWT_ACCESS_SECRET=your_production_jwt_access_secret_here
JWT_REFRESH_SECRET=your_production_jwt_refresh_secret_here
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Cookies
COOKIE_DOMAIN=
COOKIE_SECURE=false

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=120

# Structured Logging
LOG_LEVEL=debug
```

---

## 4. Installation & Setup

```bash
# Install dependencies
pnpm install

# Approve build scripts for native modules (pnpm 12)
pnpm approve-builds --all
```

---

## 5. First Administrator Creation

To initialize the primary Owner account without insecure hard-coded defaults:

```bash
# Automated creation with a generated secure random password:
pnpm seed:admin

# Or with custom credentials via arguments:
pnpm seed:admin owner@yourbusiness.com MySecurePassword! "John" "Doe"

# Or via environment variables:
INITIAL_ADMIN_EMAIL=owner@yourbusiness.com INITIAL_ADMIN_PASSWORD=MySecurePassword! pnpm seed:admin
```

---

## 6. Running Development

```bash
# Start development server with hot-reload
pnpm start:dev

# Server runs on: http://localhost:5000
# API Base: http://localhost:5000/api/v1
# Swagger Documentation: http://localhost:5000/docs
# Health Check: http://localhost:5000/health
```

---

## 7. Testing & Quality Verification

```bash
# Unit Tests (Auth, Currency math, Utilities)
pnpm test

# Full End-to-End Integration Tests (with in-memory replica set MongoDB)
pnpm test:e2e

# ESLint verification (Zero warnings, zero errors)
pnpm lint

# Production compilation
pnpm build
```

---

## 8. API Documentation (Swagger)

Swagger/OpenAPI is available in development mode at:
`http://localhost:5000/docs`

Key modules documented:
- `Authentication`: Login, Refresh, Logout, Me, Password change & reset
- `Business Settings`: Branding, Localization, Inventory rules, Module toggles
- `Products & Inventory`: Products, Categories, Brands, Units, Stock-In, Stock-Out, Adjustments, Valuations
- `Sales & Purchases`: Multi-item orders, partial payments, returns, and inventory updates
- `Reports & Dashboard`: Profit & Loss, Monthly Business Report, Health Metrics, 30-day chart datasets
- `Export`: CSV / JSON data exports

---

## 9. Production Deployment

### Production Build
```bash
pnpm build
node dist/main.js
```

### Production MongoDB Configuration
- For high-availability and atomic transactions, use **MongoDB Atlas** (M10+ or Serverless) or a self-hosted replica set (`rs0`).
- Configure automated point-in-time continuous backups in MongoDB Atlas.

### Process Management
Use PM2, Docker, or modern cloud platforms (Railway, Render, AWS ECS, Google Cloud Run):
```bash
pm2 start dist/main.js --name "business-api" -i max
```
