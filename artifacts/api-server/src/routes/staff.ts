import { Router } from "express";
import { db } from "@workspace/db";
import { staffTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { hashPassword } from "../lib/crypto";

const router = Router();

router.get("/staff", requireAuth, async (req, res): Promise<void> => {
  const staff = await db.select().from(staffTable).orderBy(staffTable.name);
  res.json(staff.map(s => ({
    ...s,
    onShift: s.onShift,
    shiftStart: s.shiftStart ?? null,
  })));
});

router.post("/staff", requireAuth, async (req, res): Promise<void> => {
  const { name, email, phone, role, password } = req.body;
  if (!name || !email || !role) {
    res.status(400).json({ error: "name, email, role are required" });
    return;
  }

  let userId: number | null = null;
  if (password) {
    const passwordHash = await hashPassword(password);
    const [user] = await db.insert(usersTable).values({
      name, email, passwordHash, role: role as any, active: true,
    }).returning();
    userId = user.id;
  }

  const [member] = await db.insert(staffTable).values({
    userId, name, email, phone, role, active: true, onShift: false,
  }).returning();

  res.status(201).json({ ...member, shiftStart: null });
});

router.patch("/staff/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { name, email, phone, role, active } = req.body;
  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = email;
  if (phone !== undefined) updateData.phone = phone;
  if (role !== undefined) updateData.role = role;
  if (active !== undefined) updateData.active = active;

  const [member] = await db.update(staffTable).set(updateData).where(eq(staffTable.id, id)).returning();
  if (!member) { res.status(404).json({ error: "Staff member not found" }); return; }
  res.json({ ...member, shiftStart: member.shiftStart ?? null });
});

router.delete("/staff/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.delete(staffTable).where(eq(staffTable.id, id));
  res.sendStatus(204);
});

router.post("/staff/:id/shift", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { action } = req.body;
  if (!action || !["start", "end"].includes(action)) {
    res.status(400).json({ error: "action must be 'start' or 'end'" });
    return;
  }

  const updateData: Record<string, unknown> = {
    onShift: action === "start",
    shiftStart: action === "start" ? new Date() : null,
  };

  const [member] = await db.update(staffTable).set(updateData).where(eq(staffTable.id, id)).returning();
  if (!member) { res.status(404).json({ error: "Staff member not found" }); return; }
  res.json({ ...member, shiftStart: member.shiftStart ?? null });
});

export default router;
