# Mini ERP + CRM System

A full-stack internal tool built as a case-study assignment for managing customers, inventory, and sales challans for a wholesale/distribution company.

Built with Node.js + Express on the backend, React + Vite on the frontend, PostgreSQL via Prisma, and JWT auth.

---

## Features

- **Authentication** — JWT-based login with access + refresh tokens, 4 user roles
- **Customer Management** — Add leads, track follow-ups, promote to active customers
- **Inventory** — Product catalog with stock levels, low-stock alerts, stock movement history
- **Sales Challans** — Create delivery challans, confirm (deducts stock), cancel (restores stock)
- **Dashboard** — Overview of active customers, recent challans, low-stock items, today's follow-ups
- **Role-based access** — Admin, Sales, Warehouse, Accounts each see/do different things

---

## Tech Stack

| Layer | Tech |
|---|---|
| Backend | Node.js, Express, TypeScript |
| ORM | Prisma |
| Database | PostgreSQL |
| Auth | JWT (access + refresh tokens) |
| Frontend | React, Vite, TypeScript, Tailwind CSS |
| Data fetching | TanStack Query (React Query) |
| Validation | Zod |
| Testing | Vitest, Supertest |

---

## Architecture

The project is a monorepo with two apps:

```
Frontend (React SPA) ──HTTP──▶ Backend REST API (Express) ──Prisma──▶ PostgreSQL
```

**Backend** is a modular Express app. Each domain (auth, customers, products, challans, dashboard) is a self-contained module with its own router, controller, service, and Zod validation schemas. Business logic lives in the service layer; controllers are thin.

**Authentication** uses short-lived JWT access tokens (in-memory on the client) and long-lived refresh tokens stored hashed in the database. This limits the blast radius of a DB compromise.

**Stock deduction** during challan confirmation uses `SELECT FOR UPDATE` to prevent concurrent confirmation of the same low-stock product from both succeeding. The entire confirm operation is a single atomic transaction.

**Product snapshots** in challan items (`productNameSnapshot`, `productSkuSnapshot`, `unitPriceSnapshot`) ensure historical challans are immutable even if the product catalog changes later.

---

## Roles & Permissions

| Action | Admin | Sales | Warehouse | Accounts |
|---|---|---|---|---|
| View customers | ✅ | ✅ | ✅ | ✅ |
| Create/edit customers | ✅ | ✅ (own only) | ❌ | ❌ |
| Delete customers | ✅ | ✅ (soft) | ❌ | ❌ |
| View products | ✅ | ✅ | ✅ | ✅ |
| Create/edit products | ✅ | ❌ | ✅ | ❌ |
| Adjust stock | ✅ | ❌ | ✅ | ❌ |
| Create challans | ✅ | ✅ | ❌ | ❌ |
| Confirm/cancel challans | ✅ | ✅ | ❌ | ❌ |

---

## Folder Structure

```
mini-erp-crm/
├── apps/
│   ├── api/              # Express backend
│   │   ├── src/
│   │   │   ├── config/   # Env validation (Zod)
│   │   │   ├── lib/      # Prisma, JWT, errors, pagination
│   │   │   ├── middleware/ # authenticate, authorize, validate, errorHandler
│   │   │   └── modules/  # auth, customers, products, challans, dashboard
│   │   ├── prisma/       # Schema, migrations, seed
│   │   └── tests/        # Vitest + Supertest integration tests
│   └── web/              # React + Vite frontend
│       └── src/
│           ├── components/ # Shared UI components
│           ├── features/  # auth, dashboard, customers, products, challans
│           └── lib/       # Axios client, React Query setup
├── postman/              # Postman collection for API testing
├── docker-compose.yml    # Postgres only — run API locally with npm run dev
└── package.json          # npm workspaces root
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- Docker (for PostgreSQL)

### 1. Clone and install

```bash
git clone <repo-url>
cd mini-erp-crm
npm install
```

### 2. Set up environment variables

Copy the example files:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

**`apps/api/.env`**:
```
DATABASE_URL=postgresql://erp_user:erp_password@localhost:5432/erp_crm
JWT_ACCESS_SECRET=your-access-secret-min-32-chars-here
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars-here
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:5173
```

**`apps/web/.env`**:
```
VITE_API_BASE_URL=http://localhost:3000/v1
```

### 3. Start PostgreSQL

```bash
docker-compose up -d
```

### 4. Run migrations and seed

```bash
npm run db:migrate    # creates tables
npm run db:seed       # adds demo users and sample data
```

### 5. Start the app

```bash
npm run dev
```

- API: http://localhost:3000
- Frontend: http://localhost:5173

### Demo Login Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@erp.local | Admin@123 |
| Sales | sales@erp.local | Sales@123 |
| Warehouse | warehouse@erp.local | Warehouse@123 |
| Accounts | accounts@erp.local | Accounts@123 |

---

## API Endpoints

All endpoints under `/v1`. Protected routes require `Authorization: Bearer <token>`.

**Auth**
- `POST /v1/auth/login` — login, returns access + refresh token
- `POST /v1/auth/refresh` — get new access token using refresh token
- `POST /v1/auth/logout` — revoke refresh token

**Customers**
- `GET /v1/customers` — list (supports `?search=`, `?status=`, `?page=`, `?limit=`)
- `POST /v1/customers` — create
- `GET /v1/customers/:id` — get with follow-up history
- `PUT /v1/customers/:id` — update
- `DELETE /v1/customers/:id` — delete (hard for Admin, soft for Sales)
- `GET /v1/customers/:id/follow-ups` — list follow-up notes
- `POST /v1/customers/:id/follow-ups` — add a follow-up note

**Products**
- `GET /v1/products` — list (supports `?search=`, `?category=`, `?lowStock=true`)
- `POST /v1/products` — create
- `GET /v1/products/:id` — get with stock movement history
- `PUT /v1/products/:id` — update
- `DELETE /v1/products/:id` — delete (only if not used in any challan)
- `GET /v1/products/:id/stock-movements` — movement history
- `POST /v1/products/:id/stock-movements` — manual stock adjustment

**Challans**
- `GET /v1/challans` — list (supports `?status=`, `?search=`)
- `POST /v1/challans` — create a draft
- `GET /v1/challans/:id` — get with line items
- `PUT /v1/challans/:id` — edit (only DRAFT)
- `POST /v1/challans/:id/confirm` — confirm and deduct stock
- `POST /v1/challans/:id/cancel` — cancel (reverses stock if was confirmed)

**Dashboard**
- `GET /v1/dashboard` — stats + recent challans + today's follow-ups + low-stock alerts

**Health**
- `GET /health` — returns `{"status":"ok"}`

A Postman collection with pre-configured requests for all endpoints is at `postman/Mini-ERP-CRM.postman_collection.json`. Login requests automatically save the token to a collection variable.

---

## Running Tests

```bash
# Make sure Docker PostgreSQL is running first
cd apps/api
npm test
```

The tests use a real PostgreSQL database — there's no mocking. Test users are created in `beforeAll` and cleaned up in `afterAll`.

---

## Deployment

Tested on [Render](https://render.com) (API) + [Vercel](https://vercel.com) (Frontend) + [Neon](https://neon.tech) (PostgreSQL) — all have free tiers.

**Backend on Render:**
1. Create a new Web Service, point it to `apps/api`
2. Build command: `npm install && npx prisma generate && npm run build`
3. Start command: `node dist/server.js`
4. Add environment variables in Render dashboard
5. Run `npx prisma migrate deploy` as a pre-deploy step

**Frontend on Vercel:**
1. Import the repo, set root directory to `apps/web`
2. Build command: `npm run build`, output dir: `dist`
3. Set `VITE_API_BASE_URL` to your Render API URL

---

## Assumptions

This project was scoped to the assignment requirements. The following decisions were made to keep the scope realistic:

- **Authentication is seeded** — users are created via seed data for demonstration. There's no self-registration UI; an admin would provision users in a real deployment.
- **Single warehouse** — stock is tracked globally. The `location` field on products stores a rack/bin label but doesn't represent a separate warehouse entity.
- **GST number is optional** — not all customers may have a GST registration (e.g. retail walk-in customers).
- **Soft delete for customers** — Sales reps mark a customer INACTIVE rather than hard-deleting, to preserve challan history integrity.
- **Stock adjustment reason is required** — all stock movements require a reason for traceability.
- **Challan editing is DRAFT-only** — once confirmed, the challan is immutable.
- **Product snapshot on challan creation** — not on confirmation. This captures what was offered to the customer when the order was placed.
- **Advanced reporting is out of scope** — revenue trends, customer performance analytics, etc. are not included in this assignment.

---

## Known Limitations / Things I'd Improve

- **No invoice PDF** — challans can be confirmed but there's no way to print/export a PDF yet
- **No email notifications** — follow-up reminders are shown on the dashboard but no emails are sent
- **No product images** — products don't support image uploads
- **No advanced search** — search is basic text matching, no date range filters
- **Single warehouse** — stock is tracked globally, not per warehouse location
- **No audit log UI** — stock movements are stored in the DB but there's no dedicated audit log page
- **Password reset** — users need an admin to reset their password directly in the DB
- **No CSV export** — lists can't be exported yet
- **No advanced reporting** — revenue analytics, customer performance, product movement trends are not included

---

## Future Improvements

- Password reset flow (email-based)
- Email/SMS notifications for follow-up reminders
- Invoice PDF generation for confirmed challans
- Product image upload
- CSV export for customers, products, stock movements
- Multi-warehouse support with location transfers
- Advanced analytics and reporting dashboard
- Audit log UI showing all system changes
- Barcode/QR scanning for stock movements

---

## Design Decisions

**Why `SELECT FOR UPDATE` on challan confirmation?**  
Two sales reps could confirm challans for the same product simultaneously. Without row-level locking, both could see sufficient stock and deduct — driving stock negative. `SELECT FOR UPDATE` serializes these operations so only one runs at a time.

**Why snapshot product details in challan items?**  
If a product's price or name changes after a challan is created, the historical challan should still show what was agreed at the time of order, not the updated price. So `productNameSnapshot`, `productSkuSnapshot`, and `unitPriceSnapshot` are captured when the challan is created.

**Why hash refresh tokens?**  
If the database is ever compromised, raw refresh tokens would let an attacker extend sessions indefinitely. Hashing them means a DB dump is useless for this purpose.

**Why filter-before-paginate for low-stock products?**  
The naive approach (fetch paginated → filter in JS) breaks pagination when low-stock items are spread across pages. The correct approach filters at the database level first, so page counts and totals are accurate.
