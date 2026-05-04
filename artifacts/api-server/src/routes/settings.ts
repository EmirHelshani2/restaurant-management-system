import { Router } from "express";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

async function getOrCreateSettings() {
  const rows = await db.select().from(settingsTable);
  if (rows.length > 0) return rows[0];
  const [s] = await db.insert(settingsTable).values({}).returning();
  return s;
}

router.get("/settings", requireAuth, requireRole("admin", "manager"), async (req, res): Promise<void> => {
  const settings = await getOrCreateSettings();
  res.json({
    ...settings,
    taxRate: parseFloat(settings.taxRate as string ?? "8"),
    serviceChargeRate: parseFloat(settings.serviceChargeRate as string ?? "10"),
  });
});

router.patch("/settings", requireAuth, requireRole("admin", "manager"), async (req, res): Promise<void> => {
  const settings = await getOrCreateSettings();
  const updateData: Record<string, unknown> = { ...req.body };
  if (updateData.taxRate != null) updateData.taxRate = updateData.taxRate.toString();
  if (updateData.serviceChargeRate != null) updateData.serviceChargeRate = updateData.serviceChargeRate.toString();

  const [updated] = await db.update(settingsTable).set(updateData).where(eq(settingsTable.id, settings.id)).returning();
  res.json({
    ...updated,
    taxRate: parseFloat(updated!.taxRate as string ?? "8"),
    serviceChargeRate: parseFloat(updated!.serviceChargeRate as string ?? "10"),
  });
});

export default router;
