import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, orderItemsTable, restaurantTablesTable, staffTable, menuItemsTable, settingsTable, notificationsTable } from "@workspace/db";
import { eq, and, inArray, sql, asc, ne } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

async function calculateOrderTotals(orderId: number) {
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));
  const subtotal = items.reduce((sum, i) => sum + parseFloat(i.unitPrice as string) * i.quantity, 0);

  const [settings] = await db.select().from(settingsTable);
  const taxRate = parseFloat((settings?.taxRate ?? "8") as string) / 100;
  const serviceRate = parseFloat((settings?.serviceChargeRate ?? "10") as string) / 100;
  const tax = subtotal * taxRate;
  const serviceCharge = subtotal * serviceRate;
  const total = subtotal + tax + serviceCharge;

  await db.update(ordersTable).set({
    subtotal: subtotal.toFixed(2),
    tax: tax.toFixed(2),
    serviceCharge: serviceCharge.toFixed(2),
    total: total.toFixed(2),
    updatedAt: new Date(),
  }).where(eq(ordersTable.id, orderId));

  return { subtotal, tax, serviceCharge, total };
}

async function enrichOrder(order: any) {
  const [table] = await db.select().from(restaurantTablesTable).where(eq(restaurantTablesTable.id, order.tableId));
  const [waiter] = await db.select().from(staffTable).where(eq(staffTable.id, order.waiterId));
  return {
    ...order,
    tableNumber: table?.number ?? 0,
    waiterName: waiter?.name ?? "",
    subtotal: parseFloat(order.subtotal ?? "0"),
    tax: parseFloat(order.tax ?? "0"),
    serviceCharge: parseFloat(order.serviceCharge ?? "0"),
    total: parseFloat(order.total ?? "0"),
  };
}

router.get("/orders", requireAuth, async (req, res): Promise<void> => {
  const { status, tableId, waiterId } = req.query as Record<string, string>;
  let orders = await db.select().from(ordersTable).orderBy(asc(ordersTable.createdAt));

  if (status) orders = orders.filter(o => o.status === status);
  if (tableId) orders = orders.filter(o => o.tableId === parseInt(tableId, 10));
  if (waiterId) orders = orders.filter(o => o.waiterId === parseInt(waiterId, 10));

  const tables = await db.select().from(restaurantTablesTable);
  const tableMap = new Map(tables.map(t => [t.id, t.number]));
  const staff = await db.select().from(staffTable);
  const staffMap = new Map(staff.map(s => [s.id, s.name]));

  const result = orders.map(o => ({
    ...o,
    tableNumber: tableMap.get(o.tableId) ?? 0,
    waiterName: staffMap.get(o.waiterId) ?? "",
    subtotal: parseFloat(o.subtotal as string ?? "0"),
    tax: parseFloat(o.tax as string ?? "0"),
    serviceCharge: parseFloat(o.serviceCharge as string ?? "0"),
    total: parseFloat(o.total as string ?? "0"),
  }));

  res.json(result);
});

router.post("/orders", requireAuth, async (req, res): Promise<void> => {
  const { tableId, waiterId, notes } = req.body;
  if (!tableId || !waiterId) {
    res.status(400).json({ error: "tableId and waiterId are required" });
    return;
  }

  const [order] = await db.insert(ordersTable).values({
    tableId, waiterId, notes, status: "open",
    subtotal: "0", tax: "0", serviceCharge: "0", total: "0",
  }).returning();

  await db.update(restaurantTablesTable).set({
    status: "occupied", waiterId, activeOrderId: order.id, updatedAt: new Date(),
  }).where(eq(restaurantTablesTable.id, tableId));

  res.status(201).json(await enrichOrder(order));
});

router.get("/orders/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

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

  const enrichedOrder = await enrichOrder(order);
  res.json({
    ...enrichedOrder,
    items: items.map(i => ({ ...i, unitPrice: parseFloat(i.unitPrice as string ?? "0") })),
  });
});

router.patch("/orders/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { status, notes } = req.body;

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (status !== undefined) updateData.status = status;
  if (notes !== undefined) updateData.notes = notes;

  const [order] = await db.update(ordersTable).set(updateData).where(eq(ordersTable.id, id)).returning();
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }

  if (status === "bill_requested") {
    await db.update(restaurantTablesTable).set({ status: "waiting_payment", updatedAt: new Date() })
      .where(eq(restaurantTablesTable.activeOrderId, id));

    await db.insert(notificationsTable).values({
      type: "bill:requested",
      message: `Bill requested for order #${id}`,
      targetRole: "cashier",
    });
  }

  res.json(await enrichOrder(order));
});

router.post("/orders/:id/items", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { items } = req.body as { items: Array<{ menuItemId: number; quantity: number; notes?: string }> };

  if (!items?.length) {
    res.status(400).json({ error: "items array is required" });
    return;
  }

  const menuItems = await db.select().from(menuItemsTable).where(
    inArray(menuItemsTable.id, items.map(i => i.menuItemId))
  );
  const menuMap = new Map(menuItems.map(m => [m.id, m]));

  const insertRows = items.map(i => {
    const menu = menuMap.get(i.menuItemId);
    if (!menu) throw new Error(`Menu item ${i.menuItemId} not found`);
    return {
      orderId: id,
      menuItemId: i.menuItemId,
      quantity: i.quantity,
      unitPrice: menu.price,
      notes: i.notes ?? null,
      status: "pending" as const,
      sentAt: new Date(),
    };
  });

  await db.insert(orderItemsTable).values(insertRows);
  await calculateOrderTotals(id);

  // Notify kitchen/bar
  const foodItems = insertRows.filter(r => menuMap.get(r.menuItemId)?.department === "kitchen");
  const drinkItems = insertRows.filter(r => menuMap.get(r.menuItemId)?.department === "bar");

  if (foodItems.length > 0) {
    await db.insert(notificationsTable).values({
      type: "kitchen:item_received",
      message: `${foodItems.length} food item(s) sent to kitchen for order #${id}`,
      targetRole: "kitchen",
    });
  }
  if (drinkItems.length > 0) {
    await db.insert(notificationsTable).values({
      type: "bar:item_received",
      message: `${drinkItems.length} drink item(s) sent to bar for order #${id}`,
      targetRole: "bar",
    });
  }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  const allItems = await db.select({
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

  const enrichedOrder = await enrichOrder(order!);
  res.status(201).json({
    ...enrichedOrder,
    items: allItems.map(i => ({ ...i, unitPrice: parseFloat(i.unitPrice as string ?? "0") })),
  });
});

router.patch("/order-items/:id/status", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { status } = req.body;

  if (!status) { res.status(400).json({ error: "status is required" }); return; }

  const updateData: Record<string, unknown> = { status };
  if (status === "ready") updateData.readyAt = new Date();

  const [item] = await db.update(orderItemsTable).set(updateData).where(eq(orderItemsTable.id, id)).returning();
  if (!item) { res.status(404).json({ error: "Order item not found" }); return; }

  const [menuItem] = await db.select().from(menuItemsTable).where(eq(menuItemsTable.id, item.menuItemId));

  if (status === "ready") {
    const dept = menuItem?.department ?? "kitchen";
    await db.insert(notificationsTable).values({
      type: `${dept}:item_ready`,
      message: `${menuItem?.name ?? "Item"} is ready for order #${item.orderId}`,
      targetRole: "waiter",
    });
  }

  res.json({
    ...item,
    menuItemName: menuItem?.name ?? "",
    department: menuItem?.department ?? "kitchen",
    unitPrice: parseFloat(item.unitPrice as string ?? "0"),
  });
});

router.get("/kitchen/orders", requireAuth, async (req, res): Promise<void> => {
  const activeOrders = await db.select().from(ordersTable)
    .where(eq(ordersTable.status, "open"))
    .orderBy(asc(ordersTable.createdAt));

  if (!activeOrders.length) { res.json([]); return; }

  const orderIds = activeOrders.map(o => o.id);

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
    .where(and(
      inArray(orderItemsTable.orderId, orderIds),
      eq(menuItemsTable.department, "kitchen"),
    ));

  const kitchenItems = items.filter(i =>
    i.status === "pending" || i.status === "accepted" || i.status === "preparing"
  );

  if (!kitchenItems.length) { res.json([]); return; }

  const tables = await db.select().from(restaurantTablesTable);
  const tableMap = new Map(tables.map(t => [t.id, t.number]));
  const staff = await db.select().from(staffTable);
  const staffMap = new Map(staff.map(s => [s.id, s.name]));

  const grouped = new Map<number, any>();
  for (const item of kitchenItems) {
    if (!grouped.has(item.orderId)) {
      const order = activeOrders.find(o => o.id === item.orderId)!;
      grouped.set(item.orderId, {
        orderId: item.orderId,
        tableNumber: tableMap.get(order.tableId) ?? 0,
        waiterName: staffMap.get(order.waiterId) ?? "",
        createdAt: order.createdAt,
        items: [],
      });
    }
    grouped.get(item.orderId)!.items.push({
      ...item,
      unitPrice: parseFloat(item.unitPrice as string ?? "0"),
    });
  }

  res.json(Array.from(grouped.values()));
});

router.get("/bar/orders", requireAuth, async (req, res): Promise<void> => {
  const activeOrders = await db.select().from(ordersTable)
    .where(eq(ordersTable.status, "open"))
    .orderBy(asc(ordersTable.createdAt));

  if (!activeOrders.length) { res.json([]); return; }

  const orderIds = activeOrders.map(o => o.id);

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
    .where(and(
      inArray(orderItemsTable.orderId, orderIds),
      eq(menuItemsTable.department, "bar"),
    ));

  const barItems = items.filter(i =>
    i.status === "pending" || i.status === "accepted" || i.status === "preparing"
  );

  if (!barItems.length) { res.json([]); return; }

  const tables = await db.select().from(restaurantTablesTable);
  const tableMap = new Map(tables.map(t => [t.id, t.number]));
  const staff = await db.select().from(staffTable);
  const staffMap = new Map(staff.map(s => [s.id, s.name]));

  const grouped = new Map<number, any>();
  for (const item of barItems) {
    if (!grouped.has(item.orderId)) {
      const order = activeOrders.find(o => o.id === item.orderId)!;
      grouped.set(item.orderId, {
        orderId: item.orderId,
        tableNumber: tableMap.get(order.tableId) ?? 0,
        waiterName: staffMap.get(order.waiterId) ?? "",
        createdAt: order.createdAt,
        items: [],
      });
    }
    grouped.get(item.orderId)!.items.push({
      ...item,
      unitPrice: parseFloat(item.unitPrice as string ?? "0"),
    });
  }

  res.json(Array.from(grouped.values()));
});

export default router;
