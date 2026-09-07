import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, salesTable, saleItemsTable, customersTable, productsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

router.get("/sales", requireAuth, async (req, res): Promise<void> => {
  const sales = await db
    .select({
      id: salesTable.id,
      customerId: salesTable.customerId,
      saleDate: salesTable.saleDate,
      invoiceNo: salesTable.invoiceNo,
      gstType: salesTable.gstType,
      placeOfSupply: salesTable.placeOfSupply,
      discount: salesTable.discount,
      taxableAmount: salesTable.taxableAmount,
      cgstAmount: salesTable.cgstAmount,
      sgstAmount: salesTable.sgstAmount,
      igstAmount: salesTable.igstAmount,
      totalAmount: salesTable.totalAmount,
      status: salesTable.status,
      notes: salesTable.notes,
      createdAt: salesTable.createdAt,
      customerName: customersTable.name,
    })
    .from(salesTable)
    .leftJoin(customersTable, eq(salesTable.customerId, customersTable.id))
    .orderBy(sql`${salesTable.saleDate} desc`);

  res.json(sales.map(s => ({
    ...s,
    customerName: s.customerName ?? "",
    discount: parseFloat(s.discount ?? "0"),
    taxableAmount: parseFloat(s.taxableAmount ?? "0"),
    cgstAmount: parseFloat(s.cgstAmount ?? "0"),
    sgstAmount: parseFloat(s.sgstAmount ?? "0"),
    igstAmount: parseFloat(s.igstAmount ?? "0"),
    totalAmount: parseFloat(s.totalAmount ?? "0") || 0,
    createdAt: s.createdAt.toISOString(),
  })));
});

router.post("/sales", requireAuth, async (req, res): Promise<void> => {
  const { customerId, saleDate, invoiceNo, notes, gstType = "intrastate", placeOfSupply, discount = 0, items } = req.body as {
    customerId?: number;
    saleDate?: string;
    invoiceNo?: string | null;
    notes?: string | null;
    gstType?: "intrastate" | "interstate";
    placeOfSupply?: string | null;
    discount?: number;
    items?: Array<{ productId: number; quantity: number; unitPrice: number; gstRate?: number; hsn?: string }>;
  };

  if (!customerId || !saleDate || !items || items.length === 0) {
    res.status(400).json({ error: "customerId, saleDate, and items are required" });
    return;
  }

  const totalTaxableBeforeDiscount = items.reduce((sum, item) => sum + round2(item.quantity * item.unitPrice), 0);
  const discountAmt = round2(discount);
  let accumulatedDiscount = 0;

  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  const computedItems = items.map((item, idx) => {
    const rawTaxable = round2(item.quantity * item.unitPrice);
    
    let itemDiscount = 0;
    if (totalTaxableBeforeDiscount > 0) {
      if (idx === items.length - 1) {
        itemDiscount = round2(discountAmt - accumulatedDiscount);
      } else {
        itemDiscount = round2(discountAmt * (rawTaxable / totalTaxableBeforeDiscount));
        accumulatedDiscount += itemDiscount;
      }
    }
    const taxable = round2(rawTaxable - itemDiscount);
    
    const gstRate = item.gstRate ?? 0;
    let cgst = 0, sgst = 0, igst = 0;
    if (gstType === "intrastate") {
      cgst = round2(taxable * (gstRate / 2) / 100);
      sgst = round2(taxable * (gstRate / 2) / 100);
    } else {
      igst = round2(taxable * gstRate / 100);
    }
    const total = round2(taxable + cgst + sgst + igst);
    
    totalTaxable += taxable;
    totalCgst += cgst;
    totalSgst += sgst;
    totalIgst += igst;
    
    return { ...item, taxable, cgst, sgst, igst, total };
  });

  totalTaxable = round2(totalTaxable);
  totalCgst = round2(totalCgst);
  totalSgst = round2(totalSgst);
  totalIgst = round2(totalIgst);
  const totalAmount = round2(totalTaxable + totalCgst + totalSgst + totalIgst);

  try {
    const result = await db.transaction(async (tx) => {
      const [sale] = await tx
        .insert(salesTable)
        .values({
          customerId,
          saleDate,
          invoiceNo: invoiceNo ?? null,
          gstType,
          placeOfSupply: placeOfSupply ?? null,
          discount: String(discountAmt),
          taxableAmount: String(totalTaxable),
          cgstAmount: String(totalCgst),
          sgstAmount: String(totalSgst),
          igstAmount: String(totalIgst),
          totalAmount: String(totalAmount),
          status: "completed",
          notes: notes ?? null,
        })
        .returning();

      const insertedItems = [];

      for (const item of computedItems) {
        const [product] = await tx.select().from(productsTable).where(eq(productsTable.id, item.productId));
        if (!product) {
          throw new Error(`Product not found (ID: ${item.productId})`);
        }
        
        const productName = product.name;
        const hsn = item.hsn ?? product.hsn ?? null;

        // Check if there is enough stock before writing
        const currentStockNum = parseFloat(product.currentStock);
        if (currentStockNum < item.quantity) {
          throw new Error(`Insufficient stock for product: ${productName}. Available: ${currentStockNum}, Requested: ${item.quantity}`);
        }

        const [si] = await tx
          .insert(saleItemsTable)
          .values({
            saleId: sale.id,
            productId: item.productId,
            hsn,
            quantity: String(item.quantity),
            unitPrice: String(item.unitPrice),
            gstRate: String(item.gstRate ?? 0),
            taxableAmount: String(item.taxable),
            cgstAmount: String(item.cgst),
            sgstAmount: String(item.sgst),
            igstAmount: String(item.igst),
            totalPrice: String(item.total),
          })
          .returning();

        await tx
          .update(productsTable)
          .set({
            currentStock: sql`GREATEST(0, ${productsTable.currentStock} - ${String(item.quantity)})`,
          })
          .where(eq(productsTable.id, item.productId));

        insertedItems.push({
          id: si.id,
          saleId: si.saleId,
          productId: si.productId,
          productName,
          hsn: si.hsn,
          quantity: parseFloat(si.quantity),
          unitPrice: parseFloat(si.unitPrice),
          gstRate: parseFloat(si.gstRate ?? "0"),
          taxableAmount: parseFloat(si.taxableAmount ?? "0"),
          cgstAmount: parseFloat(si.cgstAmount ?? "0"),
          sgstAmount: parseFloat(si.sgstAmount ?? "0"),
          igstAmount: parseFloat(si.igstAmount ?? "0"),
          totalPrice: parseFloat(si.totalPrice),
        });
      }

      const [customer] = await tx.select().from(customersTable).where(eq(customersTable.id, customerId));

      return {
        sale,
        customerName: customer?.name ?? "",
        customerGstin: customer?.gstin ?? null,
        customerAddress: customer?.address ?? null,
        customerState: customer?.state ?? null,
        items: insertedItems,
      };
    });

    res.status(201).json({
      ...result.sale,
      customerName: result.customerName,
      customerGstin: result.customerGstin,
      customerAddress: result.customerAddress,
      customerState: result.customerState,
      discount: parseFloat(result.sale.discount ?? "0"),
      taxableAmount: parseFloat(result.sale.taxableAmount ?? "0"),
      cgstAmount: parseFloat(result.sale.cgstAmount ?? "0"),
      sgstAmount: parseFloat(result.sale.sgstAmount ?? "0"),
      igstAmount: parseFloat(result.sale.igstAmount ?? "0"),
      totalAmount: parseFloat(result.sale.totalAmount),
      createdAt: result.sale.createdAt.toISOString(),
      items: result.items,
    });
  } catch (err: unknown) {
    if (err instanceof Error && (err.message.includes("Insufficient stock") || err.message.includes("Product not found"))) {
      res.status(400).json({ error: err.message });
      return;
    }
    logger.error({ err }, "Error creating sale");
    res.status(500).json({ error: "Failed to save sale due to database error" });
  }
});

router.get("/sales/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid sale ID" });
    return;
  }

  const [sale] = await db
    .select({
      id: salesTable.id,
      customerId: salesTable.customerId,
      saleDate: salesTable.saleDate,
      invoiceNo: salesTable.invoiceNo,
      gstType: salesTable.gstType,
      placeOfSupply: salesTable.placeOfSupply,
      discount: salesTable.discount,
      taxableAmount: salesTable.taxableAmount,
      cgstAmount: salesTable.cgstAmount,
      sgstAmount: salesTable.sgstAmount,
      igstAmount: salesTable.igstAmount,
      totalAmount: salesTable.totalAmount,
      status: salesTable.status,
      notes: salesTable.notes,
      createdAt: salesTable.createdAt,
      customerName: customersTable.name,
      customerGstin: customersTable.gstin,
      customerAddress: customersTable.address,
      customerState: customersTable.state,
    })
    .from(salesTable)
    .leftJoin(customersTable, eq(salesTable.customerId, customersTable.id))
    .where(eq(salesTable.id, id));

  if (!sale) {
    res.status(404).json({ error: "Sale not found" });
    return;
  }

  const rawItems = await db
    .select({
      id: saleItemsTable.id,
      saleId: saleItemsTable.saleId,
      productId: saleItemsTable.productId,
      hsn: saleItemsTable.hsn,
      quantity: saleItemsTable.quantity,
      unitPrice: saleItemsTable.unitPrice,
      gstRate: saleItemsTable.gstRate,
      taxableAmount: saleItemsTable.taxableAmount,
      cgstAmount: saleItemsTable.cgstAmount,
      sgstAmount: saleItemsTable.sgstAmount,
      igstAmount: saleItemsTable.igstAmount,
      totalPrice: saleItemsTable.totalPrice,
      productName: productsTable.name,
    })
    .from(saleItemsTable)
    .leftJoin(productsTable, eq(saleItemsTable.productId, productsTable.id))
    .where(eq(saleItemsTable.saleId, id));

  res.json({
    ...sale,
    customerName: sale.customerName ?? "",
    customerGstin: sale.customerGstin ?? null,
    customerAddress: sale.customerAddress ?? null,
    customerState: sale.customerState ?? null,
    discount: parseFloat(sale.discount ?? "0"),
    taxableAmount: parseFloat(sale.taxableAmount ?? "0"),
    cgstAmount: parseFloat(sale.cgstAmount ?? "0"),
    sgstAmount: parseFloat(sale.sgstAmount ?? "0"),
    igstAmount: parseFloat(sale.igstAmount ?? "0"),
    totalAmount: parseFloat(sale.totalAmount),
    createdAt: sale.createdAt.toISOString(),
    items: rawItems.map(i => ({
      ...i,
      productName: i.productName ?? "",
      hsn: i.hsn ?? null,
      quantity: parseFloat(i.quantity),
      unitPrice: parseFloat(i.unitPrice),
      gstRate: parseFloat(i.gstRate ?? "0"),
      taxableAmount: parseFloat(i.taxableAmount ?? "0"),
      cgstAmount: parseFloat(i.cgstAmount ?? "0"),
      sgstAmount: parseFloat(i.sgstAmount ?? "0"),
      igstAmount: parseFloat(i.igstAmount ?? "0"),
      totalPrice: parseFloat(i.totalPrice),
    })),
  });
});

router.delete("/sales/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid sale ID" });
    return;
  }

  try {
    await db.transaction(async (tx) => {
      // Fetch items before deleting so we can revert stock
      const items = await tx
        .select({ productId: saleItemsTable.productId, quantity: saleItemsTable.quantity })
        .from(saleItemsTable)
        .where(eq(saleItemsTable.saleId, id));

      const [sale] = await tx.delete(salesTable).where(eq(salesTable.id, id)).returning();

      if (!sale) {
        throw new Error("Sale not found");
      }

      // Revert stock: items that were sold must come back into inventory
      for (const item of items) {
        await tx
          .update(productsTable)
          .set({
            currentStock: sql`${productsTable.currentStock} + ${item.quantity}`,
          })
          .where(eq(productsTable.id, item.productId));
      }
    });

    res.sendStatus(204);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "Sale not found") {
      res.status(404).json({ error: "Sale not found" });
      return;
    }
    logger.error({ err }, "Error deleting sale");
    res.status(500).json({ error: "Failed to delete sale due to database error" });
  }
});

export default router;

