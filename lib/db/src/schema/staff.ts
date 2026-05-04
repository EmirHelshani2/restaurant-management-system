import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const staffTable = pgTable("staff", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  role: text("role").notNull(),
  active: boolean("active").notNull().default(true),
  onShift: boolean("on_shift").notNull().default(false),
  shiftStart: timestamp("shift_start", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type StaffMember = typeof staffTable.$inferSelect;
export type InsertStaffMember = typeof staffTable.$inferInsert;
