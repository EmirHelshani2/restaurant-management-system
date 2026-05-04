import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { verifyPassword } from "../lib/crypto";
import { signToken } from "../lib/jwt";
import { requireAuth } from "../middlewares/auth";
import { findStaffByUserId } from "../lib/staff";

const router = Router();

async function serializeUser(user: typeof usersTable.$inferSelect) {
  const staffMember = await findStaffByUserId(user.id);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    staffId: staffMember?.id ?? null,
    active: user.active,
    createdAt: user.createdAt,
  };
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail));
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  if (!user.active) {
    res.status(401).json({ error: "Account is disabled" });
    return;
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = signToken({ userId: user.id, role: user.role, email: user.email });

  res.json({
    token,
    user: await serializeUser(user),
  });
});

router.post("/auth/logout", (req, res): void => {
  res.json({ success: true });
});

router.get("/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(await serializeUser(user));
});

export default router;
