import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const { unreadOnly } = req.query as Record<string, string>;
  const userRole = req.user!.role;

  let notifications = await db.select().from(notificationsTable)
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);

  let result = notifications.filter(n =>
    !n.targetRole || n.targetRole === userRole || userRole === "admin" || userRole === "manager"
  );

  if (unreadOnly === "true") result = result.filter(n => !n.read);

  res.json(result);
});

router.patch("/notifications/:id/read", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [n] = await db.update(notificationsTable).set({ read: true }).where(eq(notificationsTable.id, id)).returning();
  if (!n) { res.status(404).json({ error: "Notification not found" }); return; }
  res.json(n);
});

router.post("/notifications/read-all", requireAuth, async (req, res): Promise<void> => {
  const userRole = req.user!.role;
  const notifications = await db.select().from(notificationsTable);
  const targets =
    userRole === "admin" || userRole === "manager"
      ? notifications
      : notifications.filter(
          (notification) =>
            !notification.targetRole || notification.targetRole === userRole,
        );

  for (const notification of targets) {
    await db
      .update(notificationsTable)
      .set({ read: true })
      .where(eq(notificationsTable.id, notification.id));
  }

  res.json({ success: true });
});

export default router;
