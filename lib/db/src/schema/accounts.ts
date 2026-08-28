import { pgTable, serial, text, timestamp, numeric, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const expenseCategoriesTable = pgTable("expense_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const incomeCategoriesTable = pgTable("income_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const expensesTable = pgTable("expenses", {
  id: serial("id").primaryKey(),
  expenseDate: date("expense_date", { mode: "string" }).notNull(),
  categoryId: integer("category_id").references(() => expenseCategoriesTable.id),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paymentMode: text("payment_mode").notNull().default("cash"),
  referenceNo: text("reference_no"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const incomesTable = pgTable("incomes", {
  id: serial("id").primaryKey(),
  incomeDate: date("income_date", { mode: "string" }).notNull(),
  categoryId: integer("category_id").references(() => incomeCategoriesTable.id),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paymentMode: text("payment_mode").notNull().default("cash"),
  referenceNo: text("reference_no"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertExpenseCategorySchema = createInsertSchema(expenseCategoriesTable).omit({ id: true, createdAt: true });
export const insertIncomeCategorySchema = createInsertSchema(incomeCategoriesTable).omit({ id: true, createdAt: true });
export const insertExpenseSchema = createInsertSchema(expensesTable).omit({ id: true, createdAt: true });
export const insertIncomeSchema = createInsertSchema(incomesTable).omit({ id: true, createdAt: true });

export type ExpenseCategory = typeof expenseCategoriesTable.$inferSelect;
export type IncomeCategory = typeof incomeCategoriesTable.$inferSelect;
export type Expense = typeof expensesTable.$inferSelect;
export type Income = typeof incomesTable.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type InsertIncome = z.infer<typeof insertIncomeSchema>;
