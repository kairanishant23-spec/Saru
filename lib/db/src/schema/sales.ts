import { pgTable, serial, text, timestamp, numeric, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { customersTable } from "./customers";
import { productsTable } from "./products";

export const salesTable = pgTable("sales", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customersTable.id),
  saleDate: date("sale_date", { mode: "string" }).notNull(),
  invoiceNo: text("invoice_no"),
  gstType: text("gst_type").notNull().default("intrastate"),
  placeOfSupply: text("place_of_supply"),
  discount: numeric("discount", { precision: 12, scale: 2 }).notNull().default("0"),
  taxableAmount: numeric("taxable_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  cgstAmount: numeric("cgst_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  sgstAmount: numeric("sgst_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  igstAmount: numeric("igst_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("completed"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const saleItemsTable = pgTable("sale_items", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").notNull().references(() => salesTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  hsn: text("hsn"),
  quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  gstRate: numeric("gst_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  taxableAmount: numeric("taxable_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  cgstAmount: numeric("cgst_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  sgstAmount: numeric("sgst_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  igstAmount: numeric("igst_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  totalPrice: numeric("total_price", { precision: 12, scale: 2 }).notNull(),
});

export const insertSaleSchema = createInsertSchema(salesTable).omit({ id: true, createdAt: true });
export const insertSaleItemSchema = createInsertSchema(saleItemsTable).omit({ id: true });

export type InsertSale = z.infer<typeof insertSaleSchema>;
export type Sale = typeof salesTable.$inferSelect;
export type SaleItem = typeof saleItemsTable.$inferSelect;
