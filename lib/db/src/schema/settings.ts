import { pgTable, serial, text, numeric } from "drizzle-orm/pg-core";

export const settingsTable = pgTable("restaurant_settings", {
  id: serial("id").primaryKey(),
  restaurantName: text("restaurant_name").notNull().default("RestoraPro"),
  address: text("address"),
  phone: text("phone"),
  currency: text("currency").notNull().default("USD"),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).notNull().default("8.00"),
  serviceChargeRate: numeric("service_charge_rate", { precision: 5, scale: 2 }).notNull().default("10.00"),
  openingTime: text("opening_time").default("08:00"),
  closingTime: text("closing_time").default("23:00"),
  receiptFooter: text("receipt_footer").default("Thank you for dining with us!"),
  timezone: text("timezone").default("UTC"),
});

export type Settings = typeof settingsTable.$inferSelect;
