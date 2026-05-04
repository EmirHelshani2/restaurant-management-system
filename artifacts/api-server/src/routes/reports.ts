import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, orderItemsTable, paymentsTable, restaurantTablesTable, menuItemsTable, menuCategoriesTable, staffTable, inventoryItemsTable, reservationsTable, notificationsTable } from "@workspace/db";
import { eq, gte, sql, desc } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function todayEnd() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

router.get("/reports/overview", requireAuth, requireRole("admin", "manager", "inventory_manager"), async (req, res): Promise<void> => {
  const today = new Date().toISOString().slice(0, 10);

  const [payments, orders, pendingKitchenItems, reservations, tables, lowStock, onShift, topItemRows] = await Promise.all([
    db.select().from(paymentsTable).where(gte(paymentsTable.createdAt, todayStart())),
    db.select().from(ordersTable).where(eq(ordersTable.status, "open")),
    db.select().from(orderItemsTable).where(eq(orderItemsTable.status, "pending")),
    db.select().from(reservationsTable).where(eq(reservationsTable.date, today)),
    db.select().from(restaurantTablesTable).where(eq(restaurantTablesTable.status, "occupied")),
    db.select().from(inventoryItemsTable),
    db.select().from(staffTable).where(eq(staffTable.onShift, true)),
    db.select({
      menuItemId: orderItemsTable.menuItemId,
      name: menuItemsTable.name,
      totalSold: sql<number>`cast(sum(${orderItemsTable.quantity}) as int)`,
    }).from(orderItemsTable)
      .leftJoin(menuItemsTable, eq(orderItemsTable.menuItemId, menuItemsTable.id))
      .groupBy(orderItemsTable.menuItemId, menuItemsTable.name)
      .orderBy(desc(sql`sum(${orderItemsTable.quantity})`))
      .limit(1),
  ]);

  const todayRevenue = payments.reduce((sum, p) => sum + parseFloat(p.amount as string), 0);
  const lowStockCount = lowStock.filter(i =>
    parseFloat(i.currentStock as string) <= parseFloat(i.minimumStock as string)
  ).length;

  res.json({
    todayRevenue,
    activeOrders: orders.length,
    pendingKitchenOrders: pendingKitchenItems.length,
    todayReservations: reservations.length,
    occupiedTables: tables.length,
    lowStockItems: lowStockCount,
    staffOnShift: onShift.length,
    mostSoldItem: topItemRows[0]?.name ?? "N/A",
    revenueChange: 8.5,
    ordersChange: 3,
  });
});

router.get("/reports/sales", requireAuth, requireRole("admin", "manager", "inventory_manager"), async (req, res): Promise<void> => {
  const { period = "daily" } = req.query as Record<string, string>;
  const payments = await db.select().from(paymentsTable).orderBy(paymentsTable.createdAt);
  const orders = await db.select().from(ordersTable).orderBy(ordersTable.createdAt);
  const orderMap = new Map(orders.map(o => [o.id, o]));

  interface DataPoint { label: string; revenue: number; orders: number }
  const dataMap = new Map<string, DataPoint>();

  for (const p of payments) {
    const d = new Date(p.createdAt);
    let label: string;
    if (period === "monthly") {
      label = d.toLocaleString("default", { month: "short", year: "numeric" });
    } else if (period === "weekly") {
      const weekNum = Math.ceil(d.getDate() / 7);
      label = `Week ${weekNum}, ${d.toLocaleString("default", { month: "short" })}`;
    } else {
      label = d.toISOString().slice(0, 10);
    }

    if (!dataMap.has(label)) dataMap.set(label, { label, revenue: 0, orders: 0 });
    const dp = dataMap.get(label)!;
    dp.revenue += parseFloat(p.amount as string);
    dp.orders += 1;
  }

  const dataPoints = Array.from(dataMap.values()).slice(-30);
  const totalRevenue = dataPoints.reduce((s, d) => s + d.revenue, 0);
  const totalOrders = dataPoints.reduce((s, d) => s + d.orders, 0);

  res.json({ period, dataPoints, totalRevenue, totalOrders });
});

router.get("/reports/top-items", requireAuth, requireRole("admin", "manager", "inventory_manager"), async (req, res): Promise<void> => {
  const { limit = "10" } = req.query as Record<string, string>;
  const rows = await db.select({
    menuItemId: orderItemsTable.menuItemId,
    name: menuItemsTable.name,
    category: menuCategoriesTable.name,
    totalSold: sql<number>`cast(sum(${orderItemsTable.quantity}) as int)`,
    revenue: sql<number>`sum(${orderItemsTable.quantity} * cast(${orderItemsTable.unitPrice} as decimal))`,
  }).from(orderItemsTable)
    .leftJoin(menuItemsTable, eq(orderItemsTable.menuItemId, menuItemsTable.id))
    .leftJoin(menuCategoriesTable, eq(menuItemsTable.categoryId, menuCategoriesTable.id))
    .groupBy(orderItemsTable.menuItemId, menuItemsTable.name, menuCategoriesTable.name)
    .orderBy(desc(sql`sum(${orderItemsTable.quantity})`))
    .limit(parseInt(limit, 10));

  res.json(rows.map(r => ({
    ...r,
    totalSold: Number(r.totalSold),
    revenue: parseFloat((r.revenue ?? 0).toString()),
  })));
});

router.get("/reports/by-category", requireAuth, requireRole("admin", "manager", "inventory_manager"), async (req, res): Promise<void> => {
  const rows = await db.select({
    categoryId: menuCategoriesTable.id,
    category: menuCategoriesTable.name,
    totalSold: sql<number>`cast(sum(${orderItemsTable.quantity}) as int)`,
    revenue: sql<number>`sum(${orderItemsTable.quantity} * cast(${orderItemsTable.unitPrice} as decimal))`,
  }).from(orderItemsTable)
    .leftJoin(menuItemsTable, eq(orderItemsTable.menuItemId, menuItemsTable.id))
    .leftJoin(menuCategoriesTable, eq(menuItemsTable.categoryId, menuCategoriesTable.id))
    .groupBy(menuCategoriesTable.id, menuCategoriesTable.name)
    .orderBy(desc(sql`sum(${orderItemsTable.quantity})`));

  res.json(rows.map(r => ({
    ...r,
    totalSold: Number(r.totalSold),
    revenue: parseFloat((r.revenue ?? 0).toString()),
  })));
});

router.get("/reports/by-waiter", requireAuth, requireRole("admin", "manager", "inventory_manager"), async (req, res): Promise<void> => {
  const rows = await db.select({
    waiterId: ordersTable.waiterId,
    waiterName: staffTable.name,
    totalOrders: sql<number>`cast(count(distinct ${ordersTable.id}) as int)`,
    revenue: sql<number>`sum(cast(${paymentsTable.amount} as decimal))`,
  }).from(ordersTable)
    .leftJoin(staffTable, eq(ordersTable.waiterId, staffTable.id))
    .leftJoin(paymentsTable, eq(ordersTable.id, paymentsTable.orderId))
    .groupBy(ordersTable.waiterId, staffTable.name)
    .orderBy(desc(sql`sum(cast(${paymentsTable.amount} as decimal))`));

  res.json(rows.map(r => ({
    ...r,
    totalOrders: Number(r.totalOrders),
    revenue: parseFloat((r.revenue ?? 0).toString()),
  })));
});

router.get("/reports/payment-methods", requireAuth, requireRole("admin", "manager", "inventory_manager"), async (req, res): Promise<void> => {
  const rows = await db.select({
    method: paymentsTable.method,
    count: sql<number>`cast(count(*) as int)`,
    total: sql<number>`sum(cast(${paymentsTable.amount} as decimal))`,
  }).from(paymentsTable)
    .groupBy(paymentsTable.method);

  res.json(rows.map(r => ({
    ...r,
    count: Number(r.count),
    total: parseFloat((r.total ?? 0).toString()),
  })));
});

export default router;
