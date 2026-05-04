import { Router } from "express";
import { db } from "@workspace/db";
import { inventoryItemsTable, stockMovementsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

router.get("/inventory", requireAuth, requireRole("admin", "manager", "inventory_manager"), async (req, res): Promise<void> => {
  const { lowStock, search } = req.query as Record<string, string>;
  let items = await db.select().from(inventoryItemsTable).orderBy(inventoryItemsTable.name);

  let result = items.map(i => ({
    ...i,
    currentStock: parseFloat(i.currentStock as string),
    minimumStock: parseFloat(i.minimumStock as string),
    costPrice: i.costPrice ? parseFloat(i.costPrice as string) : null,
    isLowStock: parseFloat(i.currentStock as string) <= parseFloat(i.minimumStock as string),
  }));

  if (lowStock === "true") result = result.filter(i => i.isLowStock);
  if (search) {
    const s = search.toLowerCase();
    result = result.filter(i => i.name.toLowerCase().includes(s) || (i.supplier ?? "").toLowerCase().includes(s));
  }

  res.json(result);
});

router.post("/inventory", requireAuth, requireRole("admin", "manager", "inventory_manager"), async (req, res): Promise<void> => {
  const { name, unit, currentStock, minimumStock, supplier, costPrice } = req.body;
  if (!name || !unit || currentStock == null || minimumStock == null) {
    res.status(400).json({ error: "name, unit, currentStock, minimumStock are required" });
    return;
  }

  const [item] = await db.insert(inventoryItemsTable).values({
    name, unit, currentStock: currentStock.toString(), minimumStock: minimumStock.toString(),
    supplier, costPrice: costPrice?.toString() ?? null,
  }).returning();

  res.status(201).json({
    ...item,
    currentStock: parseFloat(item.currentStock as string),
    minimumStock: parseFloat(item.minimumStock as string),
    costPrice: item.costPrice ? parseFloat(item.costPrice as string) : null,
    isLowStock: parseFloat(item.currentStock as string) <= parseFloat(item.minimumStock as string),
  });
});

router.patch("/inventory/:id", requireAuth, requireRole("admin", "manager", "inventory_manager"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  const fields = req.body;
  if (fields.name) updateData.name = fields.name;
  if (fields.unit) updateData.unit = fields.unit;
  if (fields.currentStock != null) updateData.currentStock = fields.currentStock.toString();
  if (fields.minimumStock != null) updateData.minimumStock = fields.minimumStock.toString();
  if (fields.supplier !== undefined) updateData.supplier = fields.supplier;
  if (fields.costPrice != null) updateData.costPrice = fields.costPrice.toString();

  const [item] = await db.update(inventoryItemsTable).set(updateData).where(eq(inventoryItemsTable.id, id)).returning();
  if (!item) { res.status(404).json({ error: "Item not found" }); return; }

  res.json({
    ...item,
    currentStock: parseFloat(item.currentStock as string),
    minimumStock: parseFloat(item.minimumStock as string),
    costPrice: item.costPrice ? parseFloat(item.costPrice as string) : null,
    isLowStock: parseFloat(item.currentStock as string) <= parseFloat(item.minimumStock as string),
  });
});

router.delete("/inventory/:id", requireAuth, requireRole("admin", "manager", "inventory_manager"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.delete(inventoryItemsTable).where(eq(inventoryItemsTable.id, id));
  res.sendStatus(204);
});

router.post("/inventory/:id/movement", requireAuth, requireRole("admin", "manager", "inventory_manager"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { type, quantity, reason } = req.body;
  if (!type || quantity == null) {
    res.status(400).json({ error: "type and quantity are required" });
    return;
  }

  await db.insert(stockMovementsTable).values({
    inventoryItemId: id, type, quantity: quantity.toString(), reason,
  });

  const [item] = await db.select().from(inventoryItemsTable).where(eq(inventoryItemsTable.id, id));
  if (!item) { res.status(404).json({ error: "Inventory item not found" }); return; }

  const current = parseFloat(item.currentStock as string);
  const delta = type === "in" ? quantity : -quantity;
  const newStock = Math.max(0, current + delta);

  const [updated] = await db.update(inventoryItemsTable).set({
    currentStock: newStock.toString(), updatedAt: new Date(),
  }).where(eq(inventoryItemsTable.id, id)).returning();

  res.status(201).json({
    ...updated,
    currentStock: parseFloat(updated!.currentStock as string),
    minimumStock: parseFloat(updated!.minimumStock as string),
    costPrice: updated!.costPrice ? parseFloat(updated!.costPrice as string) : null,
    isLowStock: parseFloat(updated!.currentStock as string) <= parseFloat(updated!.minimumStock as string),
  });
});

export default router;
