import { pgTable, text, integer, timestamp, uuid } from "drizzle-orm/pg-core";

export * from "./auth-schema";

export const todaZones = pgTable("toda_zones", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  barangay: text("barangay").notNull(),
  city: text("city").notNull(),
});

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  zoneId: uuid("zone_id").references(() => todaZones.id).notNull(),
  status: text("status").notNull().default("pending"),
  feeCentavos: integer("fee_centavos").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});