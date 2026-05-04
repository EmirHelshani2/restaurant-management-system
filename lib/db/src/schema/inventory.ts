import { pgTable, serial, integer, text, numeric, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const stockUnitEnum = pgEnum("stock_unit", ["kg", "g", "liter", "ml", "pcs"]);
export const movementTypeEnum = pgEnum("movement_type", ["in", "out"]);

export const inventoryItemsTable = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  unit: stockUnitEnum("unit").notNull(),
  currentStock: numeric("current_stock", { precision: 10, scale: 3 }).notNull(),
  minimumStock: numeric("minimum_stock", { precision: 10, scale: 3 }).notNull(),
  supplier: text("supplier"),
  costPrice: numeric("cost_price", { precision: 10, scale: 2 }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const stockMovementsTable = pgTable("stock_movements", {
  id: serial("id").primaryKey(),
  inventoryItemId: integer("inventory_item_id").notNull(),
  type: movementTypeEnum("type").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 3 }).notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type InventoryItem = typeof inventoryItemsTable.$inferSelect;
export type InsertInventoryItem = typeof inventoryItemsTable.$inferInsert;
export type StockMovement = typeof stockMovementsTable.$inferSelect;
