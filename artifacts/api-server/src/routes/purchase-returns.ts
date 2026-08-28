import { Router, type IRouter } from "express";
import { eq, sql, and } from "drizzle-orm";
import {
  db,
  purchasesTable,
  purchaseItemsTable,
  purchaseReturnItemsTable,
  purchaseReturnsTable,
  suppliersTable,
  productsTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/purchase-returns", requireAuth, async (req, res): Promise<void> => {
  const returns = await db
    .select({
      id: purchaseReturnsTable.id,
      purchaseId: purchaseReturnsTable.purchaseId,
      returnDate: purchaseReturnsTable.returnDate,
      reason: purchaseReturnsTable.reason,
      totalAmount: purchaseReturnsTable.totalAmount,
      createdAt: purchaseReturnsTable.createdAt,
      supplierName: suppliersTable.name,
      invoiceNo: purchasesTable.invoiceNo,
    })
    .from(purchaseReturnsTable)
    .leftJoin(purchasesTable, eq(purchaseReturnsTable.purchaseId, purchasesTable.id))
    .leftJoin(suppliersTable, eq(purchasesTable.supplierId, suppliersTable.id))
    .orderBy(sql`${purchaseReturnsTable.returnDate} desc`);

  res.json(returns.map(r => ({
    ...r,
    debitNoteNo: `DN-${r.id.toString().padStart(4, '0')}`,
    supplierName: r.supplierName ?? "",
    totalAmount: parseFloat(r.totalAmount),
    createdAt: r.createdAt.toISOString(),
  })));
});

router.post("/purchase-returns", requireAuth, async (req, res): Promise<void> => {
  const { purchaseId, returnDate, reason, items } = req.body as {
    purchaseId?: number;
    returnDate?: string;
    reason?: string | null;
    items?: Array<{ productId: number; quantity: number; unitPrice: number }>;
  };

  if (!purchaseId || !returnDate || !items || items.length === 0) {
    res.status(400).json({ error: "purchaseId, returnDate, and items are required" });
    return;
  }

  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  try {
    const result = await db.transaction(async (tx) => {
      // 1. Verify that the purchase exists
      const [purchase] = await tx
        .select({ id: purchasesTable.id, supplierId: purchasesTable.supplierId, invoiceNo: purchasesTable.invoiceNo })
        .from(purchasesTable)
        .where(eq(purchasesTable.id, purchaseId));
      if (!purchase) {
        throw new Error(`Original purchase record (ID: ${purchaseId}) not found.`);
      }

      const [purchaseReturn] = await tx
        .insert(purchaseReturnsTable)
        .values({
          purchaseId,
          returnDate,
          reason: reason ?? null,
          totalAmount: String(totalAmount),
        })
        .returning();

      const insertedItems = [];

      for (const item of items) {
        // 2. Verify that the product is part of the original purchase
        const [purchaseItem] = await tx
          .select({ quantity: purchaseItemsTable.quantity })
          .from(purchaseItemsTable)
          .where(and(
            eq(purchaseItemsTable.purchaseId, purchaseId),
            eq(purchaseItemsTable.productId, item.productId)
          ));
        if (!purchaseItem) {
          throw new Error(`Product ${item.productId} was not part of the original purchase invoice ${purchaseId}`);
        }
        const originalQty = parseFloat(purchaseItem.quantity);

        // 3. Query previous return quantities for this product & purchase
        const previousReturns = await tx
          .select({ quantity: purchaseReturnItemsTable.quantity })
          .from(purchaseReturnItemsTable)
          .leftJoin(purchaseReturnsTable, eq(purchaseReturnItemsTable.returnId, purchaseReturnsTable.id))
          .where(and(
            eq(purchaseReturnsTable.purchaseId, purchaseId),
            eq(purchaseReturnItemsTable.productId, item.productId)
          ));
        const returnedQtySum = previousReturns.reduce((sum, r) => sum + parseFloat(r.quantity), 0);

        const maxReturnable = originalQty - returnedQtySum;
        if (item.quantity > maxReturnable) {
          throw new Error(`Cannot return ${item.quantity} units. Max returnable remaining for this invoice is ${maxReturnable}.`);
        }

        // 4. Verify that there is enough stock in hand to return
        const [product] = await tx.select().from(productsTable).where(eq(productsTable.id, item.productId));
        if (!product) {
          throw new Error(`Product not found (ID: ${item.productId})`);
        }
        const productName = product.name;
        const currentStock = parseFloat(product.currentStock);
        if (currentStock < item.quantity) {
          throw new Error(`Cannot return ${item.quantity} units of ${productName} because current stock is only ${currentStock}.`);
        }

        const [ri] = await tx
          .insert(purchaseReturnItemsTable)
          .values({
            returnId: purchaseReturn.id,
            productId: item.productId,
            quantity: String(item.quantity),
            unitPrice: String(item.unitPrice),
            totalPrice: String(item.quantity * item.unitPrice),
          })
          .returning();

        await tx
          .update(productsTable)
          .set({
            currentStock: sql`GREATEST(0, ${productsTable.currentStock} - ${String(item.quantity)})`,
          })
          .where(eq(productsTable.id, item.productId));

        insertedItems.push({
          id: ri.id,
          returnId: ri.returnId,
          productId: ri.productId,
          productName,
          quantity: parseFloat(ri.quantity),
          unitPrice: parseFloat(ri.unitPrice),
          totalPrice: parseFloat(ri.totalPrice),
        });
      }

      const supplierName = purchase.supplierId
        ? (await tx.select({ name: suppliersTable.name }).from(suppliersTable).where(eq(suppliersTable.id, purchase.supplierId)))[0]?.name ?? ""
        : "";

      return {
        purchaseReturn,
        supplierName,
        invoiceNo: purchase.invoiceNo,
        items: insertedItems,
      };
    });

    res.status(201).json({
      ...result.purchaseReturn,
      debitNoteNo: `DN-${result.purchaseReturn.id.toString().padStart(4, '0')}`,
      supplierName: result.supplierName,
      invoiceNo: result.invoiceNo ?? null,
      totalAmount: parseFloat(result.purchaseReturn.totalAmount),
      createdAt: result.purchaseReturn.createdAt.toISOString(),
      items: result.items,
    });
  } catch (err: any) {
    if (err.message.includes("not found") || err.message.includes("Cannot return") || err.message.includes("was not part of")) {
      res.status(400).json({ error: err.message });
      return;
    }
    logger.error({ err }, "Error processing purchase return");
    res.status(500).json({ error: "Failed to save purchase return due to database error" });
  }
});

router.get("/purchase-returns/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [pr] = await db
    .select({
      id: purchaseReturnsTable.id,
      purchaseId: purchaseReturnsTable.purchaseId,
      returnDate: purchaseReturnsTable.returnDate,
      reason: purchaseReturnsTable.reason,
      totalAmount: purchaseReturnsTable.totalAmount,
      createdAt: purchaseReturnsTable.createdAt,
      supplierName: suppliersTable.name,
      invoiceNo: purchasesTable.invoiceNo,
    })
    .from(purchaseReturnsTable)
    .leftJoin(purchasesTable, eq(purchaseReturnsTable.purchaseId, purchasesTable.id))
    .leftJoin(suppliersTable, eq(purchasesTable.supplierId, suppliersTable.id))
    .where(eq(purchaseReturnsTable.id, id));

  if (!pr) {
    res.status(404).json({ error: "Purchase return not found" });
    return;
  }

  const rawItems = await db
    .select({
      id: purchaseReturnItemsTable.id,
      returnId: purchaseReturnItemsTable.returnId,
      productId: purchaseReturnItemsTable.productId,
      quantity: purchaseReturnItemsTable.quantity,
      unitPrice: purchaseReturnItemsTable.unitPrice,
      totalPrice: purchaseReturnItemsTable.totalPrice,
      productName: productsTable.name,
    })
    .from(purchaseReturnItemsTable)
    .leftJoin(productsTable, eq(purchaseReturnItemsTable.productId, productsTable.id))
    .where(eq(purchaseReturnItemsTable.returnId, id));

  res.json({
    ...pr,
    debitNoteNo: `DN-${pr.id.toString().padStart(4, '0')}`,
    supplierName: pr.supplierName ?? "",
    totalAmount: parseFloat(pr.totalAmount),
    createdAt: pr.createdAt.toISOString(),
    items: rawItems.map(i => ({
      ...i,
      productName: i.productName ?? "",
      quantity: parseFloat(i.quantity),
      unitPrice: parseFloat(i.unitPrice),
      totalPrice: parseFloat(i.totalPrice),
    })),
  });
});

export default router;
