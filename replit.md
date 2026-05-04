# RestoraPro

## Overview

Full-stack Restaurant Management System. pnpm workspace monorepo with TypeScript.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: JWT (jsonwebtoken) + Node.js built-in crypto (scrypt) for password hashing
- **Validation**: Zod, drizzle-zod
- **API codegen**: Orval (from OpenAPI spec in lib/api-spec)
- **Frontend**: React + Vite + TypeScript + TailwindCSS
- **Charts**: recharts
- **Routing**: wouter

## Artifacts

- `artifacts/api-server` — Express 5 REST API, port 8080, served at `/api`
- `artifacts/restorapro` — React+Vite frontend, port 18718, served at `/`

## Shared Libraries

- `lib/db` — Drizzle ORM schema + DB connection (`@workspace/db`)
- `lib/api-spec` — OpenAPI specification (`@workspace/api-spec`)
- `lib/api-client-react` — Orval-generated React Query hooks + custom fetch (`@workspace/api-client-react`)
- `lib/api-zod` — Orval-generated Zod schemas (`@workspace/api-zod`)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `cd artifacts/api-server && pnpm exec tsx ./src/seed.ts` — reseed demo data

## Database Schema

Tables: users, staff, restaurant_tables, menu_categories, menu_items, orders, order_items, payments, reservations, customers, inventory_items, stock_movements, notifications, restaurant_settings

## Auth

- JWT stored in localStorage as `restorapro_token`
- `setAuthTokenGetter` registered in `artifacts/restorapro/src/lib/auth.tsx`
- Backend middleware: `artifacts/api-server/src/middlewares/auth.ts`
- JWT utils: `artifacts/api-server/src/lib/jwt.ts`
- Password hashing: `artifacts/api-server/src/lib/crypto.ts` (Node.js scrypt)

## Demo Accounts (all password: `password123`)

| Email | Role |
|-------|------|
| admin@restorapro.com | admin |
| manager@restorapro.com | manager |
| waiter@restorapro.com | waiter |
| kitchen@restorapro.com | kitchen |
| bar@restorapro.com | bar |
| cashier@restorapro.com | cashier |
| reception@restorapro.com | receptionist |
| inventory@restorapro.com | inventory_manager |

## API Routes (all under /api)

- `POST /auth/login`, `POST /auth/logout`, `GET /me`
- `GET/POST /tables`, `GET/PATCH/DELETE /tables/:id`
- `GET/POST /reservations`, `GET/PATCH/DELETE /reservations/:id`
- `GET/POST /menu/categories`, `PATCH/DELETE /menu/categories/:id`
- `GET/POST /menu/items`, `GET/PATCH/DELETE /menu/items/:id`
- `GET/POST /orders`, `GET/PATCH /orders/:id`, `POST /orders/:id/items`
- `PATCH /order-items/:id/status`
- `GET /kitchen/orders`, `GET /bar/orders`
- `GET/POST /payments`, `GET /payments/:id`, `GET /orders/:id/bill`
- `GET/POST/PATCH/DELETE /inventory`, `POST /inventory/:id/movement`
- `GET/POST/PATCH/DELETE /staff`, `POST /staff/:id/shift`
- `GET/POST/PATCH /customers`, `GET /customers/:id`
- `GET /reports/overview`, `/reports/sales`, `/reports/top-items`, `/reports/by-category`, `/reports/by-waiter`, `/reports/payment-methods`
- `GET/PATCH /settings`
- `GET /notifications`, `PATCH /notifications/:id/read`, `POST /notifications/read-all`

## Modules / Pages

15 pages: Login, Dashboard, Tables (floor map), Reservations, Waiter Orders, Kitchen Display, Bar Display, Cashier/POS, Menu Management, Inventory, Staff, Customers, Reports, Settings, Receipt

## Role Access

- **admin**: everything
- **manager**: dashboard, tables, reservations, menu, staff, customers, reports, settings
- **waiter**: waiter view, tables
- **kitchen**: kitchen display
- **bar**: bar display
- **cashier**: cashier/POS, receipts
- **receptionist**: reservations, tables, customers
- **inventory_manager**: inventory, reports
