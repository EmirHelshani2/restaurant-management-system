import { Router } from "express";
import { db } from "@workspace/db";
import { customersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

router.get("/customers", requireAuth, requireRole("admin", "manager", "receptionist"), async (req, res): Promise<void> => {
  const { search } = req.query as Record<string, string>;
  let customers = await db.select().from(customersTable).orderBy(customersTable.name);

  let result = customers.map(c => ({
    ...c,
    totalSpent: parseFloat(c.totalSpent as string ?? "0"),
  }));

  if (search) {
    const s = search.toLowerCase();
    result = result.filter(c =>
      c.name.toLowerCase().includes(s) ||
      (c.phone ?? "").toLowerCase().includes(s) ||
      (c.email ?? "").toLowerCase().includes(s)
    );
  }

  res.json(result);
});

router.post("/customers", requireAuth, requireRole("admin", "manager", "receptionist"), async (req, res): Promise<void> => {
  const { name, phone, email, notes } = req.body;
  if (!name) { res.status(400).json({ error: "name is required" }); return; }
  const [customer] = await db.insert(customersTable).values({ name, phone, email, notes }).returning();
  res.status(201).json({ ...customer, totalSpent: 0 });
});

router.get("/customers/:id", requireAuth, requireRole("admin", "manager", "receptionist"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, id));
  if (!customer) { res.status(404).json({ error: "Customer not found" }); return; }
  res.json({ ...customer, totalSpent: parseFloat(customer.totalSpent as string ?? "0") });
});

router.patch("/customers/:id", requireAuth, requireRole("admin", "manager", "receptionist"), async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [customer] = await db.update(customersTable).set(req.body).where(eq(customersTable.id, id)).returning();
  if (!customer) { res.status(404).json({ error: "Customer not found" }); return; }
  res.json({ ...customer, totalSpent: parseFloat(customer.totalSpent as string ?? "0") });
});

export default router;
