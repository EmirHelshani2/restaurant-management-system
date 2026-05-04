# RestoraPro — Restaurant Management System

A full-featured restaurant management system built with React, Express, PostgreSQL, and Drizzle ORM. Supports multi-role workflows: admin, manager, waiter, kitchen, bar, cashier, receptionist, and inventory manager.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | pnpm workspaces |
| Frontend | React 19, Vite, TypeScript, TailwindCSS 4, Shadcn UI |
| Backend | Express 5, Node.js 24, TypeScript |
| Database | PostgreSQL + Drizzle ORM |
| Auth | JWT (jsonwebtoken) + scrypt password hashing |
| Routing | Wouter |
| Charts | Recharts |
| API codegen | Orval (from OpenAPI spec) |

---

## Folder Structure

```
restaurant-management-system/
├── artifacts/
│   ├── api-server/          # Express REST API (port 8080)
│   └── restorapro/          # React + Vite frontend (port 18718)
├── lib/
│   ├── db/                  # Drizzle ORM schema + DB connection
│   ├── api-spec/            # OpenAPI specification
│   ├── api-client-react/    # Orval-generated React Query hooks
│   └── api-zod/             # Orval-generated Zod schemas
├── .env.example             # Environment variable template
├── pnpm-workspace.yaml      # pnpm workspace definition
└── README.md
```

---

## Prerequisites

- Node.js 20+ (recommended: v24)
- pnpm 9+ (`npm install -g pnpm`)
- PostgreSQL database (local or remote)

---

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/EmirHelshani2/restaurant-management-system
cd restaurant-management-system
```

### 2. Install dependencies

```bash
pnpm install
```

> **Note:** This project requires pnpm. Running `npm install` or `yarn` will fail at the preinstall check.

### 3. Set up environment variables

Copy the example and fill in your values:

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/restorapro
SESSION_SECRET=your-strong-random-secret-here
PORT=8080
```

### 4. Create the database

Using psql or your preferred tool:

```sql
CREATE DATABASE restorapro;
```

### 5. Push the schema

```bash
pnpm --filter @workspace/db run push
```

### 6. Seed demo data

```bash
pnpm run seed
```

This creates all demo accounts, tables, menu items, inventory, reservations, and settings.

---

## Running Locally

Start both servers in separate terminals:

```bash
# Terminal 1 — API server (port 8080)
pnpm run dev:api

# Terminal 2 — Frontend (port 18718)
pnpm run dev:web
```

Then open: http://localhost:18718

---

## Admin Account

| Field | Value |
|-------|-------|
| Email | emirhelshani@gmail.com |
| Password | password123 |
| Role | admin |

The admin account has access to all pages and modules.

---

## Demo Accounts

All demo accounts use password: `password123`

| Email | Role |
|-------|------|
| emirhelshani@gmail.com | admin |
| admin@restorapro.com | admin |
| manager@restorapro.com | manager |
| waiter@restorapro.com | waiter |
| kitchen@restorapro.com | kitchen |
| bar@restorapro.com | bar |
| cashier@restorapro.com | cashier |
| reception@restorapro.com | receptionist |
| inventory@restorapro.com | inventory_manager |

---

## Role-Based Access

| Role | Pages |
|------|-------|
| admin | All pages |
| manager | Dashboard, Tables, Reservations, Menu, Staff, Customers, Reports, Settings |
| waiter | Waiter orders, Tables |
| kitchen | Kitchen display |
| bar | Bar display |
| cashier | Cashier/POS, Receipts |
| receptionist | Reservations, Tables, Customers |
| inventory_manager | Inventory, Reports |

---

## Core Workflow

### Full Service Cycle

1. **Reservation** — Receptionist/admin creates a reservation, assigns a table, confirms, and seats the guest (table → occupied)
2. **Order** — Waiter opens a table order, adds food/drink items, sends to kitchen/bar
3. **Kitchen** — Kitchen staff see food items, mark as accepted → preparing → ready
4. **Bar** — Bar staff see drink items, mark as accepted → preparing → ready
5. **Serving** — Waiter sees ready items, marks them served; requests bill when done
6. **Payment** — Cashier sees open bills, processes cash/card/mixed payment, prints receipt; table → available/cleaning

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all dependencies |
| `pnpm run dev:api` | Start API server in watch mode |
| `pnpm run dev:web` | Start frontend dev server |
| `pnpm run seed` | Seed database with demo data |
| `pnpm run build` | Typecheck + build all packages |
| `pnpm run typecheck` | Full TypeScript check |
| `pnpm --filter @workspace/db run push` | Push DB schema to database |

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `SESSION_SECRET` | No | `restorapro-dev-secret-2024` | JWT signing secret |
| `PORT` | No | `8080` | API server port |
| `VITE_API_BASE_URL` | No | `http://localhost:8080` | Frontend API base URL |

---

## API Routes

All routes are prefixed with `/api`.

- `POST /auth/login`, `POST /auth/logout`, `GET /me`
- `GET/POST /tables`, `PATCH/DELETE /tables/:id`
- `GET/POST /reservations`, `PATCH/DELETE /reservations/:id`
- `GET/POST /menu/categories`, `PATCH/DELETE /menu/categories/:id`
- `GET/POST /menu/items`, `PATCH/DELETE /menu/items/:id`
- `GET/POST /orders`, `PATCH /orders/:id`, `POST /orders/:id/items`
- `PATCH /order-items/:id/status`
- `GET /kitchen/orders`, `GET /bar/orders`
- `GET/POST /payments`, `GET /payments/:id`, `GET /orders/:id/bill`
- `GET/POST/PATCH/DELETE /inventory`, `POST /inventory/:id/movement`
- `GET/POST/PATCH/DELETE /staff`, `POST /staff/:id/shift`
- `GET/POST/PATCH /customers`, `GET /customers/:id`
- `GET /reports/overview|sales|top-items|by-category|by-waiter|payment-methods`
- `GET/PATCH /settings`
- `GET /notifications`, `PATCH /notifications/:id/read`, `POST /notifications/read-all`
- `GET /health`

---

## Troubleshooting

**`DATABASE_URL must be set` error**
Make sure `.env` exists in the project root with a valid `DATABASE_URL`.

**`pnpm` not found**
Install pnpm: `npm install -g pnpm`

**Schema push fails**
Ensure your PostgreSQL server is running and the database exists before running `pnpm --filter @workspace/db run push`.

**Seed fails with duplicate key errors**
The seed is idempotent — re-running is safe. If you see errors, check your `DATABASE_URL` is pointing to the correct database.

**Frontend can't reach API**
Make sure the API server is running on port 8080. Check `VITE_API_BASE_URL` if using a different port.

**Login fails after seeding**
Run `pnpm run seed` again to ensure the admin account is up to date. The seed uses upsert for users.
