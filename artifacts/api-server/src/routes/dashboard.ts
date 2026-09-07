import { Router, type IRouter } from "express";
import { sql, gte, eq } from "drizzle-orm";
import {
  db,
  productsTable,
  suppliersTable,
  customersTable,
  purchasesTable,
  salesTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/dashboard/stats", requireAuth, async (req, res): Promise<void> => {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

  const [[{ count: totalProducts }], [{ count: totalSuppliers }], [{ count: totalCustomers }]] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(productsTable),
    db.select({ count: sql<number>`count(*)::int` }).from(suppliersTable),
    db.select({ count: sql<number>`count(*)::int` }).from(customersTable),
  ]);

  const [[{ total: totalPurchasesThisMonth }], [{ total: totalSalesThisMonth }]] = await Promise.all([
    db.select({ total: sql<number>`coalesce(sum(total_amount::numeric), 0)` })
      .from(purchasesTable)
      .where(gte(purchasesTable.purchaseDate, firstOfMonth)),
    db.select({ total: sql<number>`coalesce(sum(total_amount::numeric), 0)` })
      .from(salesTable)
      .where(gte(salesTable.saleDate, firstOfMonth)),
  ]);

  const [{ count: lowStockCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(productsTable)
    .where(sql`${productsTable.currentStock}::numeric <= ${productsTable.minStock}::numeric`);

  const recentPurchasesRaw = await db
    .select({
      id: purchasesTable.id,
      supplierId: purchasesTable.supplierId,
      purchaseDate: purchasesTable.purchaseDate,
      invoiceNo: purchasesTable.invoiceNo,
      totalAmount: purchasesTable.totalAmount,
      status: purchasesTable.status,
      notes: purchasesTable.notes,
      createdAt: purchasesTable.createdAt,
      supplierName: suppliersTable.name,
    })
    .from(purchasesTable)
    .leftJoin(suppliersTable, eq(purchasesTable.supplierId, suppliersTable.id))
    .orderBy(sql`${purchasesTable.createdAt} desc`)
    .limit(5);

  const recentSalesRaw = await db
    .select({
      id: salesTable.id,
      customerId: salesTable.customerId,
      saleDate: salesTable.saleDate,
      invoiceNo: salesTable.invoiceNo,
      totalAmount: salesTable.totalAmount,
      status: salesTable.status,
      notes: salesTable.notes,
      createdAt: salesTable.createdAt,
      customerName: customersTable.name,
    })
    .from(salesTable)
    .leftJoin(customersTable, eq(salesTable.customerId, customersTable.id))
    .orderBy(sql`${salesTable.createdAt} desc`)
    .limit(5);

  res.json({
    totalProducts: totalProducts ?? 0,
    totalSuppliers: totalSuppliers ?? 0,
    totalCustomers: totalCustomers ?? 0,
    totalPurchasesThisMonth: Number(totalPurchasesThisMonth) || 0,
    totalSalesThisMonth: Number(totalSalesThisMonth) || 0,
    lowStockCount: lowStockCount ?? 0,
    recentPurchases: recentPurchasesRaw.map(p => ({
      ...p,
      supplierName: p.supplierName ?? "",
      totalAmount: parseFloat(p.totalAmount),
      createdAt: p.createdAt.toISOString(),
    })),
    recentSales: recentSalesRaw.map(s => ({
      ...s,
      customerName: s.customerName ?? "",
      totalAmount: parseFloat(s.totalAmount),
      createdAt: s.createdAt.toISOString(),
    })),
  });
});

export default router;
