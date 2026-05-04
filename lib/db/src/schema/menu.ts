import { pgTable, serial, integer, text, boolean, numeric, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const departmentEnum = pgEnum("department", ["kitchen", "bar"]);

export const menuCategoriesTable = pgTable("menu_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const menuItemsTable = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  categoryId: integer("category_id").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  imageUrl: text("image_url"),
  available: boolean("available").notNull().default(true),
  department: departmentEnum("department").notNull(),
  preparationTime: integer("preparation_time").default(15),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type MenuCategory = typeof menuCategoriesTable.$inferSelect;
export type InsertMenuCategory = typeof menuCategoriesTable.$inferInsert;
export type MenuItem = typeof menuItemsTable.$inferSelect;
export type InsertMenuItem = typeof menuItemsTable.$inferInsert;
