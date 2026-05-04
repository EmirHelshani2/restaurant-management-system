import { Router } from "express";
import { db } from "@workspace/db";
import { restaurantTablesTable, usersTable, staffTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/tables", requireAuth, async (req, res): Promise<void> => {
  const tables = await db.select().from(restaurantTablesTable).orderBy(restaurantTablesTable.number);

  const staffRows = await db.select({ id: staffTable.id, name: staffTable.name, userId: staffTable.userId }).from(staffTable);
  const staffMap = new Map(staffRows.map(s => [s.id, s.name]));

  const result = tables.map(t => ({
    ...t,
    waiterId: t.waiterId ?? null,
    waiterName: t.waiterId ? (staffMap.get(t.waiterId) ?? null) : null,
    activeOrderId: t.activeOrderId ?? null,
    positionX: t.positionX,
    positionY: t.positionY,
    section: t.section ?? "main",
  }));

  res.json(result);
});

router.post("/tables", requireAuth, async (req, res): Promise<void> => {
  const { number, name, capacity, section, positionX, positionY } = req.body;
  if (!number || !capacity) {
    res.status(400).json({ error: "number and capacity are required" });
    return;
  }
  const [table] = await db.insert(restaurantTablesTable).values({
    number, name, capacity, section: section ?? "main",
    positionX: positionX ?? 0, positionY: positionY ?? 0,
  }).returning();
  res.status(201).json({ ...table, waiterId: null, waiterName: null, activeOrderId: null });
});

router.get("/tables/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [table] = await db.select().from(restaurantTablesTable).where(eq(restaurantTablesTable.id, id));
  if (!table) { res.status(404).json({ error: "Table not found" }); return; }

  let waiterName: string | null = null;
  if (table.waiterId) {
    const [staff] = await db.select().from(staffTable).where(eq(staffTable.id, table.waiterId));
    waiterName = staff?.name ?? null;
  }
  res.json({ ...table, waiterName, activeOrderId: table.activeOrderId ?? null });
});

router.patch("/tables/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { number, name, capacity, status, waiterId, section, positionX, positionY } = req.body;

  const updateData: Record<string, unknown> = {};
  if (number !== undefined) updateData.number = number;
  if (name !== undefined) updateData.name = name;
  if (capacity !== undefined) updateData.capacity = capacity;
  if (status !== undefined) updateData.status = status;
  if (waiterId !== undefined) updateData.waiterId = waiterId;
  if (section !== undefined) updateData.section = section;
  if (positionX !== undefined) updateData.positionX = positionX;
  if (positionY !== undefined) updateData.positionY = positionY;
  updateData.updatedAt = new Date();

  const [table] = await db.update(restaurantTablesTable).set(updateData).where(eq(restaurantTablesTable.id, id)).returning();
  if (!table) { res.status(404).json({ error: "Table not found" }); return; }

  let waiterName: string | null = null;
  if (table.waiterId) {
    const [staff] = await db.select().from(staffTable).where(eq(staffTable.id, table.waiterId));
    waiterName = staff?.name ?? null;
  }
  res.json({ ...table, waiterName, activeOrderId: table.activeOrderId ?? null });
});

router.delete("/tables/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.delete(restaurantTablesTable).where(eq(restaurantTablesTable.id, id));
  res.sendStatus(204);
});

export default router;
