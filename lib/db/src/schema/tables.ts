import { pgTable, serial, integer, text, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const tableStatusEnum = pgEnum("table_status", [
  "available", "reserved", "occupied", "waiting_payment", "cleaning"
]);

export const restaurantTablesTable = pgTable("restaurant_tables", {
  id: serial("id").primaryKey(),
  number: integer("number").notNull().unique(),
  name: text("name"),
  capacity: integer("capacity").notNull(),
  status: tableStatusEnum("status").notNull().default("available"),
  waiterId: integer("waiter_id"),
  positionX: integer("position_x").notNull().default(0),
  positionY: integer("position_y").notNull().default(0),
  section: text("section").default("main"),
  activeOrderId: integer("active_order_id"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type RestaurantTable = typeof restaurantTablesTable.$inferSelect;
export type InsertRestaurantTable = typeof restaurantTablesTable.$inferInsert;
