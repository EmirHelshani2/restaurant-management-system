import { pgTable, serial, integer, text, numeric, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const paymentMethodEnum = pgEnum("payment_method", ["cash", "card", "mixed"]);

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  method: paymentMethodEnum("method").notNull(),
  cashAmount: numeric("cash_amount", { precision: 10, scale: 2 }),
  cardAmount: numeric("card_amount", { precision: 10, scale: 2 }),
  discount: numeric("discount", { precision: 10, scale: 2 }).notNull().default("0"),
  changeGiven: numeric("change_given", { precision: 10, scale: 2 }),
  processedBy: integer("processed_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Payment = typeof paymentsTable.$inferSelect;
export type InsertPayment = typeof paymentsTable.$inferInsert;
