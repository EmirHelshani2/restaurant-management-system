import { Router } from "express";
import { db } from "@workspace/db";
import { paymentsTable, ordersTable, orderItemsTable, restaurantTablesTable, staffTable, menuItemsTable, settingsTable, notificationsTable, customersTable } from "@workspace/db";
import { eq, gte, lte, and, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/payments", requireAuth, async (req, res): Promise<void> => {
  const { startDate, endDate } = req.query as Record<string, string>;
  let payments = await db.select().from(paymentsTable).orderBy(paymentsTable.createdAt);

  const tables = await db.select().from(restaurantTablesTable);
  const tableMap = new Map(tables.map(t => [t.id, t.number]));
  const staff = await db.select().from(staffTable);
  const staffMap = new Map(staff.map(s => [s.id, s.name]));
  const orders = await db.select().from(ordersTable);
  const orderMap = new Map(orders.map(o => [o.id, o]));

  let result = payments.map(p => {
    const order = orderMap.get(p.orderId);
    return {
      ...p,
      tableNumber: order ? (tableMap.get(order.tableId) ?? 0) : 0,
      processedByName: staffMap.get(p.processedBy) ?? "",
      amount: parseFloat(p.amount as string),
      cashAmount: p.cashAmount ? parseFloat(p.cashAmount as string) : null,
      cardAmount: p.cardAmount ? parseFloat(p.cardAmount as string) : null,
      discount: parseFloat(p.discount as string ?? "0"),
      changeGiven: p.changeGiven ? parseFloat(p.changeGiven as string) : null,
    };
  });

  if (startDate) result = result.filter(p => p.createdAt >= new Date(startDate));
  if (endDate) result = result.filter(p => p.createdAt <= new Date(endDate));

  res.json(result);
});

router.post("/payments", requireAuth, async (req, res): Promise<void> => {
  const { orderId, method, cashAmount, cardAmount, discount, processedBy } = req.body;
  if (!orderId || !method || !processedBy) {
    res.status(400).json({ error: "orderId, method, processedBy are required" });
    return;
  }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const total = parseFloat(order.total as string ?? "0");
  const disc = parseFloat(discount ?? "0");
  const finalAmount = total - disc;
  const cash = cashAmount ? parseFloat(cashAmount) : null;
  const card = cardAmount ? parseFloat(cardAmount) : null;
  const change = cash && method === "cash" ? Math.max(0, cash - finalAmount) : null;

  const [payment] = await db.insert(paymentsTable).values({
    orderId,
    amount: finalAmount.toFixed(2),
    method,
    cashAmount: cash?.toFixed(2) ?? null,
    cardAmount: card?.toFixed(2) ?? null,
    discount: disc.toFixed(2),
    changeGiven: change?.toFixed(2) ?? null,
    processedBy,
  }).returning();

  await db.update(ordersTable).set({ status: "paid", updatedAt: new Date() }).where(eq(ordersTable.id, orderId));

  const [table] = await db.select().from(restaurantTablesTable).where(eq(restaurantTablesTable.activeOrderId, orderId));
  if (table) {
    await db.update(restaurantTablesTable).set({
      status: "cleaning", waiterId: null, activeOrderId: null, updatedAt: new Date(),
    }).where(eq(restaurantTablesTable.id, table.id));
  }

  await db.insert(notificationsTable).values({
    type: "payment:completed",
    message: `Payment of $${finalAmount.toFixed(2)} processed for order #${orderId}`,
    targetRole: "manager",
  });

  const [proc] = await db.select().from(staffTable).where(eq(staffTable.id, processedBy));
  const tableNum = table?.number ?? 0;

  res.status(201).json({
    ...payment,
    tableNumber: tableNum,
    processedByName: proc?.name ?? "",
    amount: parseFloat(payment.amount as string),
    cashAmount: payment.cashAmount ? parseFloat(payment.cashAmount as string) : null,
    cardAmount: payment.cardAmount ? parseFloat(payment.cardAmount as string) : null,
    discount: parseFloat(payment.discount as string ?? "0"),
    changeGiven: payment.changeGiven ? parseFloat(payment.changeGiven as string) : null,
  });
});

router.get("/payments/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, id));
  if (!payment) { res.status(404).json({ error: "Payment not found" }); return; }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, payment.orderId));
  const [table] = order ? await db.select().from(restaurantTablesTable).where(eq(restaurantTablesTable.id, order.tableId)) : [null];
  const [waiter] = order ? await db.select().from(staffTable).where(eq(staffTable.id, order.waiterId)) : [null];
  const [proc] = await db.select().from(staffTable).where(eq(staffTable.id, payment.processedBy));

  const items = order ? await db.select({
    id: orderItemsTable.id,
    orderId: orderItemsTable.orderId,
    menuItemId: orderItemsTable.menuItemId,
    menuItemName: menuItemsTable.name,
    department: menuItemsTable.department,
    quantity: orderItemsTable.quantity,
    unitPrice: orderItemsTable.unitPrice,
    notes: orderItemsTable.notes,
    status: orderItemsTable.status,
    sentAt: orderItemsTable.sentAt,
    readyAt: orderItemsTable.readyAt,
  }).from(orderItemsTable)
    .leftJoin(menuItemsTable, eq(orderItemsTable.menuItemId, menuItemsTable.id))
    .where(eq(orderItemsTable.orderId, order.id)) : [];

  res.json({
    ...payment,
    tableNumber: table?.number ?? 0,
    processedByName: proc?.name ?? "",
    amount: parseFloat(payment.amount as string),
    cashAmount: payment.cashAmount ? parseFloat(payment.cashAmount as string) : null,
    cardAmount: payment.cardAmount ? parseFloat(payment.cardAmount as string) : null,
    discount: parseFloat(payment.discount as string ?? "0"),
    changeGiven: payment.changeGiven ? parseFloat(payment.changeGiven as string) : null,
    order: order ? {
      ...order,
      tableNumber: table?.number ?? 0,
      waiterName: waiter?.name ?? "",
      subtotal: parseFloat(order.subtotal as string ?? "0"),
      tax: parseFloat(order.tax as string ?? "0"),
      serviceCharge: parseFloat(order.serviceCharge as string ?? "0"),
      total: parseFloat(order.total as string ?? "0"),
      items: items.map(i => ({ ...i, unitPrice: parseFloat(i.unitPrice as string ?? "0") })),
    } : null,
  });
});

router.get("/orders/:id/bill", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  const [table] = await db.select().from(restaurantTablesTable).where(eq(restaurantTablesTable.id, order.tableId));

  const items = await db.select({
    id: orderItemsTable.id,
    orderId: orderItemsTable.orderId,
    menuItemId: orderItemsTable.menuItemId,
    menuItemName: menuItemsTable.name,
    department: menuItemsTable.department,
    quantity: orderItemsTable.quantity,
    unitPrice: orderItemsTable.unitPrice,
    notes: orderItemsTable.notes,
    status: orderItemsTable.status,
    sentAt: orderItemsTable.sentAt,
    readyAt: orderItemsTable.readyAt,
  }).from(orderItemsTable)
    .leftJoin(menuItemsTable, eq(orderItemsTable.menuItemId, menuItemsTable.id))
    .where(eq(orderItemsTable.orderId, id));

  res.json({
    orderId: id,
    tableNumber: table?.number ?? 0,
    items: items.map(i => ({ ...i, unitPrice: parseFloat(i.unitPrice as string ?? "0") })),
    subtotal: parseFloat(order.subtotal as string ?? "0"),
    tax: parseFloat(order.tax as string ?? "0"),
    serviceCharge: parseFloat(order.serviceCharge as string ?? "0"),
    discount: 0,
    total: parseFloat(order.total as string ?? "0"),
  });
});

export default router;
