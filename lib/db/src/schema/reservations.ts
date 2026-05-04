import { pgTable, serial, integer, text, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const reservationStatusEnum = pgEnum("reservation_status", [
  "pending", "confirmed", "seated", "cancelled", "no_show", "completed"
]);

export const reservationsTable = pgTable("reservations", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerEmail: text("customer_email"),
  guestCount: integer("guest_count").notNull(),
  date: text("date").notNull(),
  time: text("time").notNull(),
  notes: text("notes"),
  status: reservationStatusEnum("status").notNull().default("pending"),
  tableId: integer("table_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Reservation = typeof reservationsTable.$inferSelect;
export type InsertReservation = typeof reservationsTable.$inferInsert;
