import { Router } from "express";
import { db } from "@workspace/db";
import { reservationsTable, restaurantTablesTable } from "@workspace/db";
import { eq, and, gte, lte, ilike, or, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { notificationsTable } from "@workspace/db";

const router = Router();

router.get("/reservations", requireAuth, async (req, res): Promise<void> => {
  const { date, status, search } = req.query as Record<string, string>;

  let query = db.select().from(reservationsTable);
  const conditions = [];

  if (date) conditions.push(eq(reservationsTable.date, date));
  if (status) conditions.push(eq(reservationsTable.status, status as any));

  const reservations = await db.select().from(reservationsTable).orderBy(reservationsTable.date, reservationsTable.time);

  const tables = await db.select().from(restaurantTablesTable);
  const tableMap = new Map(tables.map(t => [t.id, t.number]));

  let result = reservations.map(r => ({
    ...r,
    tableNumber: r.tableId ? (tableMap.get(r.tableId) ?? null) : null,
  }));

  if (date) result = result.filter(r => r.date === date);
  if (status) result = result.filter(r => r.status === status);
  if (search) {
    const s = search.toLowerCase();
    result = result.filter(r =>
      r.customerName.toLowerCase().includes(s) ||
      r.customerPhone.toLowerCase().includes(s) ||
      (r.customerEmail ?? "").toLowerCase().includes(s)
    );
  }

  res.json(result);
});

router.post("/reservations", requireAuth, async (req, res): Promise<void> => {
  const { customerName, customerPhone, customerEmail, guestCount, date, time, notes, tableId } = req.body;
  if (!customerName || !customerPhone || !guestCount || !date || !time) {
    res.status(400).json({ error: "Required fields missing" });
    return;
  }

  const [reservation] = await db.insert(reservationsTable).values({
    customerName, customerPhone, customerEmail, guestCount, date, time, notes,
    tableId: tableId ?? null, status: "pending",
  }).returning();

  await db.insert(notificationsTable).values({
    type: "reservation:created",
    message: `New reservation for ${customerName} on ${date} at ${time}`,
    targetRole: "receptionist",
  });

  const tables = await db.select().from(restaurantTablesTable);
  const tableMap = new Map(tables.map(t => [t.id, t.number]));

  res.status(201).json({
    ...reservation,
    tableNumber: reservation.tableId ? (tableMap.get(reservation.tableId) ?? null) : null,
  });
});

router.get("/reservations/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [r] = await db.select().from(reservationsTable).where(eq(reservationsTable.id, id));
  if (!r) { res.status(404).json({ error: "Reservation not found" }); return; }

  let tableNumber: number | null = null;
  if (r.tableId) {
    const [t] = await db.select().from(restaurantTablesTable).where(eq(restaurantTablesTable.id, r.tableId));
    tableNumber = t?.number ?? null;
  }
  res.json({ ...r, tableNumber });
});

router.patch("/reservations/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const fields = req.body;
  fields.updatedAt = new Date();

  const [r] = await db.update(reservationsTable).set(fields).where(eq(reservationsTable.id, id)).returning();
  if (!r) { res.status(404).json({ error: "Reservation not found" }); return; }

  let tableNumber: number | null = null;
  if (r.tableId) {
    const [t] = await db.select().from(restaurantTablesTable).where(eq(restaurantTablesTable.id, r.tableId));
    tableNumber = t?.number ?? null;
  }
  res.json({ ...r, tableNumber });
});

router.delete("/reservations/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.delete(reservationsTable).where(eq(reservationsTable.id, id));
  res.sendStatus(204);
});

export default router;
