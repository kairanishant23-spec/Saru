import { Router, type IRouter } from "express";
import { and, asc, eq, gte, lte, lt, sql } from "drizzle-orm";
import {
  db,
  expenseCategoriesTable,
  incomeCategoriesTable,
  expensesTable,
  incomesTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function num(v: string | null | undefined): number {
  return parseFloat(v ?? "0") || 0;
}

const DEFAULT_EXPENSE_CATEGORIES = [
  "Rent",
  "Electricity & Utilities",
  "Transport & Freight",
  "Staff Salary",
  "Office Supplies",
  "Packaging Material",
  "Bank Charges",
  "Repairs & Maintenance",
  "Advertising",
  "Miscellaneous",
];

const DEFAULT_INCOME_CATEGORIES = [
  "Interest Income",
  "Commission Income",
  "Rent Received",
  "Discount Received",
  "Other Income",
];

let expenseCategoriesSeeded = false;
let incomeCategoriesSeeded = false;

async function seedExpenseCategories() {
  if (expenseCategoriesSeeded) return;
  const existing = await db.select({ id: expenseCategoriesTable.id }).from(expenseCategoriesTable).limit(1);
  if (existing.length === 0) {
    await db.insert(expenseCategoriesTable).values(
      DEFAULT_EXPENSE_CATEGORIES.map((name) => ({ name }))
    );
  }
  expenseCategoriesSeeded = true;
}

async function seedIncomeCategories() {
  if (incomeCategoriesSeeded) return;
  const existing = await db.select({ id: incomeCategoriesTable.id }).from(incomeCategoriesTable).limit(1);
  if (existing.length === 0) {
    await db.insert(incomeCategoriesTable).values(
      DEFAULT_INCOME_CATEGORIES.map((name) => ({ name }))
    );
  }
  incomeCategoriesSeeded = true;
}

router.get("/accounts/expense-categories", requireAuth, async (req, res): Promise<void> => {
  await seedExpenseCategories();
  const rows = await db.select().from(expenseCategoriesTable).orderBy(asc(expenseCategoriesTable.name));
  res.json(rows);
});

router.post("/accounts/expense-categories", requireAuth, async (req, res): Promise<void> => {
  const { name } = req.body as { name: string };
  if (!name?.trim()) { res.status(400).json({ error: "Name is required" }); return; }
  const [row] = await db.insert(expenseCategoriesTable).values({ name: name.trim() }).returning();
  res.status(201).json(row);
});

router.get("/accounts/income-categories", requireAuth, async (req, res): Promise<void> => {
  await seedIncomeCategories();
  const rows = await db.select().from(incomeCategoriesTable).orderBy(asc(incomeCategoriesTable.name));
  res.json(rows);
});

router.post("/accounts/income-categories", requireAuth, async (req, res): Promise<void> => {
  const { name } = req.body as { name: string };
  if (!name?.trim()) { res.status(400).json({ error: "Name is required" }); return; }
  const [row] = await db.insert(incomeCategoriesTable).values({ name: name.trim() }).returning();
  res.status(201).json(row);
});

router.get("/accounts/expenses", requireAuth, async (req, res): Promise<void> => {
  const { from, to } = req.query as { from?: string; to?: string };
  const conds = [];
  if (from) conds.push(gte(expensesTable.expenseDate, from));
  if (to) conds.push(lte(expensesTable.expenseDate, to));

  const rows = await db
    .select({
      id: expensesTable.id,
      expenseDate: expensesTable.expenseDate,
      categoryId: expensesTable.categoryId,
      categoryName: expenseCategoriesTable.name,
      description: expensesTable.description,
      amount: expensesTable.amount,
      paymentMode: expensesTable.paymentMode,
      referenceNo: expensesTable.referenceNo,
      notes: expensesTable.notes,
      createdAt: expensesTable.createdAt,
    })
    .from(expensesTable)
    .leftJoin(expenseCategoriesTable, eq(expensesTable.categoryId, expenseCategoriesTable.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(asc(expensesTable.expenseDate));

  res.json(
    rows.map((r) => ({
      ...r,
      amount: num(r.amount),
      createdAt: r.createdAt.toISOString(),
    }))
  );
});

router.post("/accounts/expenses", requireAuth, async (req, res): Promise<void> => {
  const body = req.body as {
    expenseDate: string;
    categoryId?: number | null;
    description: string;
    amount: number;
    paymentMode: string;
    referenceNo?: string | null;
    notes?: string | null;
  };

  if (!body.expenseDate || !body.description || body.amount == null || !body.paymentMode) {
    res.status(400).json({ error: "expenseDate, description, amount, and paymentMode are required" });
    return;
  }

  const [inserted] = await db.insert(expensesTable).values({
    expenseDate: body.expenseDate,
    categoryId: body.categoryId ?? null,
    description: body.description,
    amount: String(body.amount),
    paymentMode: body.paymentMode,
    referenceNo: body.referenceNo ?? null,
    notes: body.notes ?? null,
  }).returning();

  const [row] = await db
    .select({
      id: expensesTable.id,
      expenseDate: expensesTable.expenseDate,
      categoryId: expensesTable.categoryId,
      categoryName: expenseCategoriesTable.name,
      description: expensesTable.description,
      amount: expensesTable.amount,
      paymentMode: expensesTable.paymentMode,
      referenceNo: expensesTable.referenceNo,
      notes: expensesTable.notes,
      createdAt: expensesTable.createdAt,
    })
    .from(expensesTable)
    .leftJoin(expenseCategoriesTable, eq(expensesTable.categoryId, expenseCategoriesTable.id))
    .where(eq(expensesTable.id, inserted.id));

  res.status(201).json({ ...row, amount: num(row.amount), createdAt: row.createdAt.toISOString() });
});

router.put("/accounts/expenses/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid expense ID" });
    return;
  }
  const body = req.body as {
    expenseDate: string;
    categoryId?: number | null;
    description: string;
    amount: number;
    paymentMode: string;
    referenceNo?: string | null;
    notes?: string | null;
  };

  await db.update(expensesTable).set({
    expenseDate: body.expenseDate,
    categoryId: body.categoryId ?? null,
    description: body.description,
    amount: String(body.amount),
    paymentMode: body.paymentMode,
    referenceNo: body.referenceNo ?? null,
    notes: body.notes ?? null,
  }).where(eq(expensesTable.id, id));

  const [row] = await db
    .select({
      id: expensesTable.id,
      expenseDate: expensesTable.expenseDate,
      categoryId: expensesTable.categoryId,
      categoryName: expenseCategoriesTable.name,
      description: expensesTable.description,
      amount: expensesTable.amount,
      paymentMode: expensesTable.paymentMode,
      referenceNo: expensesTable.referenceNo,
      notes: expensesTable.notes,
      createdAt: expensesTable.createdAt,
    })
    .from(expensesTable)
    .leftJoin(expenseCategoriesTable, eq(expensesTable.categoryId, expenseCategoriesTable.id))
    .where(eq(expensesTable.id, id));

  if (!row) {
    res.status(404).json({ error: "Expense not found" });
    return;
  }

  res.json({ ...row, amount: num(row.amount), createdAt: row.createdAt.toISOString() });
});

router.delete("/accounts/expenses/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid expense ID" });
    return;
  }
  await db.delete(expensesTable).where(eq(expensesTable.id, id));
  res.json({ message: "Deleted" });
});

router.get("/accounts/incomes", requireAuth, async (req, res): Promise<void> => {
  const { from, to } = req.query as { from?: string; to?: string };
  const conds = [];
  if (from) conds.push(gte(incomesTable.incomeDate, from));
  if (to) conds.push(lte(incomesTable.incomeDate, to));

  const rows = await db
    .select({
      id: incomesTable.id,
      incomeDate: incomesTable.incomeDate,
      categoryId: incomesTable.categoryId,
      categoryName: incomeCategoriesTable.name,
      description: incomesTable.description,
      amount: incomesTable.amount,
      paymentMode: incomesTable.paymentMode,
      referenceNo: incomesTable.referenceNo,
      notes: incomesTable.notes,
      createdAt: incomesTable.createdAt,
    })
    .from(incomesTable)
    .leftJoin(incomeCategoriesTable, eq(incomesTable.categoryId, incomeCategoriesTable.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(asc(incomesTable.incomeDate));

  res.json(
    rows.map((r) => ({
      ...r,
      amount: num(r.amount),
      createdAt: r.createdAt.toISOString(),
    }))
  );
});

router.post("/accounts/incomes", requireAuth, async (req, res): Promise<void> => {
  const body = req.body as {
    incomeDate: string;
    categoryId?: number | null;
    description: string;
    amount: number;
    paymentMode: string;
    referenceNo?: string | null;
    notes?: string | null;
  };

  if (!body.incomeDate || !body.description || body.amount == null || !body.paymentMode) {
    res.status(400).json({ error: "incomeDate, description, amount, and paymentMode are required" });
    return;
  }

  const [inserted] = await db.insert(incomesTable).values({
    incomeDate: body.incomeDate,
    categoryId: body.categoryId ?? null,
    description: body.description,
    amount: String(body.amount),
    paymentMode: body.paymentMode,
    referenceNo: body.referenceNo ?? null,
    notes: body.notes ?? null,
  }).returning();

  const [row] = await db
    .select({
      id: incomesTable.id,
      incomeDate: incomesTable.incomeDate,
      categoryId: incomesTable.categoryId,
      categoryName: incomeCategoriesTable.name,
      description: incomesTable.description,
      amount: incomesTable.amount,
      paymentMode: incomesTable.paymentMode,
      referenceNo: incomesTable.referenceNo,
      notes: incomesTable.notes,
      createdAt: incomesTable.createdAt,
    })
    .from(incomesTable)
    .leftJoin(incomeCategoriesTable, eq(incomesTable.categoryId, incomeCategoriesTable.id))
    .where(eq(incomesTable.id, inserted.id));

  res.status(201).json({ ...row, amount: num(row.amount), createdAt: row.createdAt.toISOString() });
});

router.put("/accounts/incomes/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid income ID" });
    return;
  }
  const body = req.body as {
    incomeDate: string;
    categoryId?: number | null;
    description: string;
    amount: number;
    paymentMode: string;
    referenceNo?: string | null;
    notes?: string | null;
  };

  await db.update(incomesTable).set({
    incomeDate: body.incomeDate,
    categoryId: body.categoryId ?? null,
    description: body.description,
    amount: String(body.amount),
    paymentMode: body.paymentMode,
    referenceNo: body.referenceNo ?? null,
    notes: body.notes ?? null,
  }).where(eq(incomesTable.id, id));

  const [row] = await db
    .select({
      id: incomesTable.id,
      incomeDate: incomesTable.incomeDate,
      categoryId: incomesTable.categoryId,
      categoryName: incomeCategoriesTable.name,
      description: incomesTable.description,
      amount: incomesTable.amount,
      paymentMode: incomesTable.paymentMode,
      referenceNo: incomesTable.referenceNo,
      notes: incomesTable.notes,
      createdAt: incomesTable.createdAt,
    })
    .from(incomesTable)
    .leftJoin(incomeCategoriesTable, eq(incomesTable.categoryId, incomeCategoriesTable.id))
    .where(eq(incomesTable.id, id));

  if (!row) {
    res.status(404).json({ error: "Income not found" });
    return;
  }

  res.json({ ...row, amount: num(row.amount), createdAt: row.createdAt.toISOString() });
});

router.delete("/accounts/incomes/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid income ID" });
    return;
  }
  await db.delete(incomesTable).where(eq(incomesTable.id, id));
  res.json({ message: "Deleted" });
});

async function getLedgerBook(paymentMode: string, from?: string, to?: string) {
  const expConds = [eq(expensesTable.paymentMode, paymentMode)];
  if (from) expConds.push(gte(expensesTable.expenseDate, from));
  if (to) expConds.push(lte(expensesTable.expenseDate, to));

  const incConds = [eq(incomesTable.paymentMode, paymentMode)];
  if (from) incConds.push(gte(incomesTable.incomeDate, from));
  if (to) incConds.push(lte(incomesTable.incomeDate, to));

  // Compute opening balance from all transactions before 'from' date
  let openingBalance = 0;
  if (from) {
    const prevExpConds = [eq(expensesTable.paymentMode, paymentMode), lt(expensesTable.expenseDate, from)];
    const prevIncConds = [eq(incomesTable.paymentMode, paymentMode), lt(incomesTable.incomeDate, from)];

    const [prevExpSum] = await db
      .select({ total: sql<string>`coalesce(sum(amount::numeric), 0)` })
      .from(expensesTable)
      .where(and(...prevExpConds));

    const [prevIncSum] = await db
      .select({ total: sql<string>`coalesce(sum(amount::numeric), 0)` })
      .from(incomesTable)
      .where(and(...prevIncConds));

    openingBalance = num(prevIncSum?.total) - num(prevExpSum?.total);
  }

  const expRows = await db
    .select({
      date: expensesTable.expenseDate,
      description: expensesTable.description,
      categoryName: expenseCategoriesTable.name,
      referenceNo: expensesTable.referenceNo,
      amount: expensesTable.amount,
    })
    .from(expensesTable)
    .leftJoin(expenseCategoriesTable, eq(expensesTable.categoryId, expenseCategoriesTable.id))
    .where(and(...expConds));

  const incRows = await db
    .select({
      date: incomesTable.incomeDate,
      description: incomesTable.description,
      categoryName: incomeCategoriesTable.name,
      referenceNo: incomesTable.referenceNo,
      amount: incomesTable.amount,
    })
    .from(incomesTable)
    .leftJoin(incomeCategoriesTable, eq(incomesTable.categoryId, incomeCategoriesTable.id))
    .where(and(...incConds));

  const combined = [
    ...expRows.map((r) => ({ date: r.date, type: "expense", description: r.description, categoryName: r.categoryName ?? null, referenceNo: r.referenceNo ?? null, receipts: 0, payments: num(r.amount) })),
    ...incRows.map((r) => ({ date: r.date, type: "income", description: r.description, categoryName: r.categoryName ?? null, referenceNo: r.referenceNo ?? null, receipts: num(r.amount), payments: 0 })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  let runningBalance = openingBalance;
  const entries = combined.map((e) => {
    runningBalance += e.receipts - e.payments;
    return { ...e, balance: parseFloat(runningBalance.toFixed(2)) };
  });

  const totalReceipts = parseFloat(entries.reduce((s, e) => s + e.receipts, 0).toFixed(2));
  const totalPayments = parseFloat(entries.reduce((s, e) => s + e.payments, 0).toFixed(2));
  const closingBalance = parseFloat((openingBalance + totalReceipts - totalPayments).toFixed(2));

  return { entries, totalReceipts, totalPayments, closingBalance, openingBalance };
}

router.get("/accounts/cash-book", requireAuth, async (req, res): Promise<void> => {
  const { from, to } = req.query as { from?: string; to?: string };
  res.json(await getLedgerBook("cash", from, to));
});

router.get("/accounts/bank-book", requireAuth, async (req, res): Promise<void> => {
  const { from, to } = req.query as { from?: string; to?: string };
  res.json(await getLedgerBook("bank", from, to));
});

export default router;
