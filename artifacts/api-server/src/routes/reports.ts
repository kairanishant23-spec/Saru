import { Router, type IRouter } from "express";
import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import {
  db,
  salesTable,
  saleItemsTable,
  purchasesTable,
  purchaseItemsTable,
  purchaseReturnsTable,
  productsTable,
  customersTable,
  suppliersTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function num(v: string | null | undefined): number {
  return parseFloat(v ?? "0") || 0;
}

router.get("/reports/sales", requireAuth, async (req, res): Promise<void> => {
  const { from, to } = req.query as { from?: string; to?: string };
  const conds = [];
  if (from) conds.push(gte(salesTable.saleDate, from));
  if (to) conds.push(lte(salesTable.saleDate, to));

  const rows = await db
    .select({
      id: salesTable.id,
      saleDate: salesTable.saleDate,
      invoiceNo: salesTable.invoiceNo,
      customerName: customersTable.name,
      gstType: salesTable.gstType,
      taxableAmount: salesTable.taxableAmount,
      discount: salesTable.discount,
      cgstAmount: salesTable.cgstAmount,
      sgstAmount: salesTable.sgstAmount,
      igstAmount: salesTable.igstAmount,
      totalAmount: salesTable.totalAmount,
    })
    .from(salesTable)
    .leftJoin(customersTable, eq(salesTable.customerId, customersTable.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(salesTable.saleDate);

  const mapped = rows.map(r => ({
    id: r.id,
    saleDate: r.saleDate,
    invoiceNo: r.invoiceNo ?? null,
    customerName: r.customerName ?? "",
    gstType: r.gstType,
    taxableAmount: num(r.taxableAmount),
    discount: num(r.discount),
    cgstAmount: num(r.cgstAmount),
    sgstAmount: num(r.sgstAmount),
    igstAmount: num(r.igstAmount),
    totalTax: num(r.cgstAmount) + num(r.sgstAmount) + num(r.igstAmount),
    totalAmount: num(r.totalAmount),
  }));

  const summary = {
    count: mapped.length,
    totalTaxable: mapped.reduce((s, r) => s + r.taxableAmount, 0),
    totalDiscount: mapped.reduce((s, r) => s + r.discount, 0),
    totalTax: mapped.reduce((s, r) => s + r.totalTax, 0),
    totalAmount: mapped.reduce((s, r) => s + r.totalAmount, 0),
  };

  res.json({ rows: mapped, summary });
});

router.get("/reports/purchases", requireAuth, async (req, res): Promise<void> => {
  const { from, to } = req.query as { from?: string; to?: string };
  const conds = [];
  if (from) conds.push(gte(purchasesTable.purchaseDate, from));
  if (to) conds.push(lte(purchasesTable.purchaseDate, to));

  const rows = await db
    .select({
      id: purchasesTable.id,
      purchaseDate: purchasesTable.purchaseDate,
      invoiceNo: purchasesTable.invoiceNo,
      supplierName: suppliersTable.name,
      totalAmount: purchasesTable.totalAmount,
    })
    .from(purchasesTable)
    .leftJoin(suppliersTable, eq(purchasesTable.supplierId, suppliersTable.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(purchasesTable.purchaseDate);

  const allPurchaseIds = rows.map(r => r.id);
  const returns = allPurchaseIds.length 
    ? await db
        .select({
          purchaseId: purchaseReturnsTable.purchaseId,
          totalAmount: purchaseReturnsTable.totalAmount
        })
        .from(purchaseReturnsTable)
        .where(inArray(purchaseReturnsTable.purchaseId, allPurchaseIds))
    : [];

  const returnsMap = new Map<number, number>();
  for (const ret of returns) {
    const prev = returnsMap.get(ret.purchaseId) ?? 0;
    returnsMap.set(ret.purchaseId, prev + num(ret.totalAmount));
  }

  const mapped = rows.map(r => {
    const returnAmount = returnsMap.get(r.id) ?? 0;
    const grossAmount = num(r.totalAmount);
    const netAmount = parseFloat((grossAmount - returnAmount).toFixed(2));
    return {
      id: r.id,
      purchaseDate: r.purchaseDate,
      invoiceNo: r.invoiceNo ?? null,
      supplierName: r.supplierName ?? "",
      grossAmount,
      returnAmount,
      totalAmount: netAmount,
    };
  });

  const summary = {
    count: mapped.length,
    totalGrossAmount: parseFloat(mapped.reduce((s, r) => s + r.grossAmount, 0).toFixed(2)),
    totalReturnAmount: parseFloat(mapped.reduce((s, r) => s + r.returnAmount, 0).toFixed(2)),
    totalAmount: parseFloat(mapped.reduce((s, r) => s + r.totalAmount, 0).toFixed(2)),
  };

  res.json({ rows: mapped, summary });
});

router.get("/reports/stock", requireAuth, async (req, res): Promise<void> => {
  const rows = await db
    .select({
      id: productsTable.id,
      name: productsTable.name,
      sku: productsTable.sku,
      category: productsTable.category,
      unit: productsTable.unit,
      hsn: productsTable.hsn,
      gstRate: productsTable.gstRate,
      currentStock: productsTable.currentStock,
      minStock: productsTable.minStock,
      purchasePrice: productsTable.purchasePrice,
      sellingPrice: productsTable.sellingPrice,
    })
    .from(productsTable)
    .orderBy(productsTable.name);

  const mapped = rows.map(r => {
    const stock = num(r.currentStock);
    const purchasePrice = num(r.purchasePrice);
    const sellingPrice = num(r.sellingPrice);
    return {
      id: r.id,
      name: r.name,
      sku: r.sku ?? null,
      category: r.category ?? null,
      unit: r.unit,
      hsn: r.hsn ?? null,
      gstRate: num(r.gstRate),
      currentStock: stock,
      minStock: num(r.minStock),
      purchasePrice,
      sellingPrice,
      stockValue: parseFloat((stock * purchasePrice).toFixed(2)),
      retailValue: parseFloat((stock * sellingPrice).toFixed(2)),
      belowMin: stock < num(r.minStock),
    };
  });

  const summary = {
    totalProducts: mapped.length,
    totalStockValue: parseFloat(mapped.reduce((s, r) => s + r.stockValue, 0).toFixed(2)),
    totalRetailValue: parseFloat(mapped.reduce((s, r) => s + r.retailValue, 0).toFixed(2)),
    lowStockCount: mapped.filter(r => r.belowMin).length,
  };

  res.json({ rows: mapped, summary });
});

router.get("/reports/profit", requireAuth, async (req, res): Promise<void> => {
  const { from, to } = req.query as { from?: string; to?: string };
  const conds = [];
  if (from) conds.push(gte(salesTable.saleDate, from));
  if (to) conds.push(lte(salesTable.saleDate, to));

  const sales = await db
    .select({
      id: salesTable.id,
      saleDate: salesTable.saleDate,
      invoiceNo: salesTable.invoiceNo,
      customerName: customersTable.name,
      totalAmount: salesTable.totalAmount,
      taxableAmount: salesTable.taxableAmount,
      cgstAmount: salesTable.cgstAmount,
      sgstAmount: salesTable.sgstAmount,
      igstAmount: salesTable.igstAmount,
    })
    .from(salesTable)
    .leftJoin(customersTable, eq(salesTable.customerId, customersTable.id))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(salesTable.saleDate);

  // Fetch ALL sale items in one query instead of one query per sale (avoids N+1)
  const allSaleIds = sales.map(s => s.id);
  const allItems = allSaleIds.length
    ? await db
        .select({
          saleId: saleItemsTable.saleId,
          quantity: saleItemsTable.quantity,
          purchasePrice: productsTable.purchasePrice,
        })
        .from(saleItemsTable)
        .leftJoin(productsTable, eq(saleItemsTable.productId, productsTable.id))
        .where(inArray(saleItemsTable.saleId, allSaleIds))
    : [];

  // Group items by saleId for O(1) lookup
  const itemsBySaleId = new Map<number, typeof allItems>();
  for (const item of allItems) {
    const list = itemsBySaleId.get(item.saleId) ?? [];
    list.push(item);
    itemsBySaleId.set(item.saleId, list);
  }

  const rows = sales.map(sale => {
    const items = itemsBySaleId.get(sale.id) ?? [];
    const revenue = num(sale.taxableAmount);
    const cogs = items.reduce((s, i) => s + num(i.quantity) * num(i.purchasePrice), 0);
    const grossProfit = parseFloat((revenue - cogs).toFixed(2));
    const margin = revenue > 0 ? parseFloat(((grossProfit / revenue) * 100).toFixed(2)) : 0;
    const totalTax = num(sale.cgstAmount) + num(sale.sgstAmount) + num(sale.igstAmount);

    return {
      id: sale.id,
      saleDate: sale.saleDate,
      invoiceNo: sale.invoiceNo ?? null,
      customerName: sale.customerName ?? "",
      revenue: parseFloat(revenue.toFixed(2)),
      cogs: parseFloat(cogs.toFixed(2)),
      grossProfit,
      margin,
      totalTax: parseFloat(totalTax.toFixed(2)),
      totalAmount: num(sale.totalAmount),
    };
  });

  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalCogs = rows.reduce((s, r) => s + r.cogs, 0);
  const totalGrossProfit = parseFloat((totalRevenue - totalCogs).toFixed(2));

  const summary = {
    count: rows.length,
    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
    totalCogs: parseFloat(totalCogs.toFixed(2)),
    totalGrossProfit,
    overallMargin: totalRevenue > 0 ? parseFloat(((totalGrossProfit / totalRevenue) * 100).toFixed(2)) : 0,
  };

  res.json({ rows, summary });
});

export default router;
