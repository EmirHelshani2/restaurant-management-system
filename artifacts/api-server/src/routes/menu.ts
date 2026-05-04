import { Router } from "express";
import { db } from "@workspace/db";
import { menuCategoriesTable, menuItemsTable } from "@workspace/db";
import { eq, and, ilike, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// Categories
router.get("/menu/categories", requireAuth, async (req, res): Promise<void> => {
  const cats = await db.select().from(menuCategoriesTable).orderBy(menuCategoriesTable.sortOrder);
  res.json(cats);
});

router.post("/menu/categories", requireAuth, async (req, res): Promise<void> => {
  const { name, description, sortOrder } = req.body;
  if (!name) { res.status(400).json({ error: "name is required" }); return; }
  const [cat] = await db.insert(menuCategoriesTable).values({ name, description, sortOrder: sortOrder ?? 0 }).returning();
  res.status(201).json(cat);
});

router.patch("/menu/categories/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [cat] = await db.update(menuCategoriesTable).set(req.body).where(eq(menuCategoriesTable.id, id)).returning();
  if (!cat) { res.status(404).json({ error: "Category not found" }); return; }
  res.json(cat);
});

router.delete("/menu/categories/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.delete(menuCategoriesTable).where(eq(menuCategoriesTable.id, id));
  res.sendStatus(204);
});

// Items
router.get("/menu/items", requireAuth, async (req, res): Promise<void> => {
  const { categoryId, available, search, department } = req.query as Record<string, string>;

  const items = await db.select({
    id: menuItemsTable.id,
    name: menuItemsTable.name,
    description: menuItemsTable.description,
    categoryId: menuItemsTable.categoryId,
    categoryName: menuCategoriesTable.name,
    price: menuItemsTable.price,
    imageUrl: menuItemsTable.imageUrl,
    available: menuItemsTable.available,
    department: menuItemsTable.department,
    preparationTime: menuItemsTable.preparationTime,
  }).from(menuItemsTable)
    .leftJoin(menuCategoriesTable, eq(menuItemsTable.categoryId, menuCategoriesTable.id))
    .orderBy(menuCategoriesTable.sortOrder, menuItemsTable.name);

  let result = items.map(i => ({ ...i, price: parseFloat(i.price as string) }));

  if (categoryId) result = result.filter(i => i.categoryId === parseInt(categoryId, 10));
  if (available !== undefined) result = result.filter(i => i.available === (available === "true"));
  if (department) result = result.filter(i => i.department === department);
  if (search) {
    const s = search.toLowerCase();
    result = result.filter(i => i.name.toLowerCase().includes(s) || (i.description ?? "").toLowerCase().includes(s));
  }

  res.json(result);
});

router.post("/menu/items", requireAuth, async (req, res): Promise<void> => {
  const { name, description, categoryId, price, imageUrl, available, department, preparationTime } = req.body;
  if (!name || !categoryId || price == null || !department) {
    res.status(400).json({ error: "name, categoryId, price, department are required" });
    return;
  }

  const [item] = await db.insert(menuItemsTable).values({
    name, description, categoryId, price: price.toString(), imageUrl,
    available: available !== false, department, preparationTime: preparationTime ?? 15,
  }).returning();

  const [cat] = await db.select().from(menuCategoriesTable).where(eq(menuCategoriesTable.id, item.categoryId));

  res.status(201).json({
    ...item,
    price: parseFloat(item.price as string),
    categoryName: cat?.name ?? "",
  });
});

router.get("/menu/items/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [item] = await db.select({
    id: menuItemsTable.id,
    name: menuItemsTable.name,
    description: menuItemsTable.description,
    categoryId: menuItemsTable.categoryId,
    categoryName: menuCategoriesTable.name,
    price: menuItemsTable.price,
    imageUrl: menuItemsTable.imageUrl,
    available: menuItemsTable.available,
    department: menuItemsTable.department,
    preparationTime: menuItemsTable.preparationTime,
  }).from(menuItemsTable)
    .leftJoin(menuCategoriesTable, eq(menuItemsTable.categoryId, menuCategoriesTable.id))
    .where(eq(menuItemsTable.id, id));

  if (!item) { res.status(404).json({ error: "Menu item not found" }); return; }
  res.json({ ...item, price: parseFloat(item.price as string) });
});

router.patch("/menu/items/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const updateData: Record<string, unknown> = { ...req.body };
  if (updateData.price) updateData.price = updateData.price.toString();

  const [item] = await db.update(menuItemsTable).set(updateData).where(eq(menuItemsTable.id, id)).returning();
  if (!item) { res.status(404).json({ error: "Menu item not found" }); return; }

  const [cat] = await db.select().from(menuCategoriesTable).where(eq(menuCategoriesTable.id, item.categoryId));
  res.json({ ...item, price: parseFloat(item.price as string), categoryName: cat?.name ?? "" });
});

router.delete("/menu/items/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  await db.delete(menuItemsTable).where(eq(menuItemsTable.id, id));
  res.sendStatus(204);
});

export default router;
