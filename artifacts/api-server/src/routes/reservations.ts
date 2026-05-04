import { Router } from "express";
import { db } from "@workspace/db";
import { reservationsTable, restaurantTablesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { notificationsTable } from "@workspace/db";

const router = Router();

async function updateTableStatusIfNoActiveOrder(
  tableId: number,
  status: "available" | "reserved" | "occupied",
) {
  const [table] = await db
    .select()
    .from(restaurantTablesTable)
    .where(eq(restaurantTablesTable.id, tableId));

  if (!table || table.activeOrderId) {
    return;
  }

  await db
    .update(restaurantTablesTable)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(restaurantTablesTable.id, tableId));
}

async function syncReservationTableState(
  previousReservation: typeof reservationsTable.$inferSelect | null,
  nextReservation: typeof reservationsTable.$inferSelect,
) {
  if (previousReservation?.tableId && previousReservation.tableId !== nextReservation.tableId) {
    await updateTableStatusIfNoActiveOrder(previousReservation.tableId, "available");
  }

  if (!nextReservation.tableId) {
    return;
  }

  if (
    nextReservation.status === "cancelled" ||
    nextReservation.status === "no_show" ||
    nextReservation.status === "completed"
  ) {
    await updateTableStatusIfNoActiveOrder(nextReservation.tableId, "available");
    return;
  }

  if (nextReservation.status === "seated") {
    await updateTableStatusIfNoActiveOrder(nextReservation.tableId, "occupied");
    return;
  }

  await updateTableStatusIfNoActiveOrder(nextReservation.tableId, "reserved");
}

router.get(
  "/reservations",
  requireAuth,
  requireRole("admin", "manager", "receptionist"),
  async (req, res): Promise<void> => {
  const { date, status, search } = req.query as Record<string, string>;

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

router.post(
  "/reservations",
  requireAuth,
  requireRole("admin", "manager", "receptionist"),
  async (req, res): Promise<void> => {
  const { customerName, customerPhone, customerEmail, guestCount, date, time, notes, tableId } = req.body;
  if (!customerName || !customerPhone || !guestCount || !date || !time) {
    res.status(400).json({ error: "Required fields missing" });
    return;
  }

  if (tableId) {
    const [table] = await db
      .select()
      .from(restaurantTablesTable)
      .where(eq(restaurantTablesTable.id, tableId));

    if (!table) {
      res.status(404).json({ error: "Assigned table not found" });
      return;
    }

    if (table.activeOrderId) {
      res.status(400).json({ error: "Assigned table already has an active order" });
      return;
    }
  }

  const [reservation] = await db.insert(reservationsTable).values({
    customerName, customerPhone, customerEmail, guestCount, date, time, notes,
    tableId: tableId ?? null, status: "pending",
  }).returning();

  await syncReservationTableState(null, reservation);

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

router.get(
  "/reservations/:id",
  requireAuth,
  requireRole("admin", "manager", "receptionist"),
  async (req, res): Promise<void> => {
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

router.patch(
  "/reservations/:id",
  requireAuth,
  requireRole("admin", "manager", "receptionist"),
  async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [existingReservation] = await db
    .select()
    .from(reservationsTable)
    .where(eq(reservationsTable.id, id));

  if (!existingReservation) {
    res.status(404).json({ error: "Reservation not found" });
    return;
  }

  const fields = { ...req.body };
  fields.updatedAt = new Date();

  const nextTableId =
    fields.tableId !== undefined ? fields.tableId : existingReservation.tableId;
  const nextStatus =
    fields.status !== undefined ? fields.status : existingReservation.status;

  if (nextStatus === "seated" && !nextTableId) {
    res.status(400).json({ error: "A table must be assigned before seating a reservation" });
    return;
  }

  if (nextTableId) {
    const [table] = await db
      .select()
      .from(restaurantTablesTable)
      .where(eq(restaurantTablesTable.id, nextTableId));

    if (!table) {
      res.status(404).json({ error: "Assigned table not found" });
      return;
    }

    const isChangingTable = existingReservation.tableId !== nextTableId;
    if (table.activeOrderId && isChangingTable) {
      res.status(400).json({ error: "Assigned table already has an active order" });
      return;
    }
  }

  const [r] = await db
    .update(reservationsTable)
    .set(fields)
    .where(eq(reservationsTable.id, id))
    .returning();

  await syncReservationTableState(existingReservation, r);

  let tableNumber: number | null = null;
  if (r.tableId) {
    const [t] = await db.select().from(restaurantTablesTable).where(eq(restaurantTablesTable.id, r.tableId));
    tableNumber = t?.number ?? null;
  }
  res.json({ ...r, tableNumber });
});

router.delete(
  "/reservations/:id",
  requireAuth,
  requireRole("admin", "manager", "receptionist"),
  async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [reservation] = await db
    .select()
    .from(reservationsTable)
    .where(eq(reservationsTable.id, id));

  if (reservation?.tableId) {
    await updateTableStatusIfNoActiveOrder(reservation.tableId, "available");
  }

  await db.delete(reservationsTable).where(eq(reservationsTable.id, id));
  res.sendStatus(204);
});

export default router;
