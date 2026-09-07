import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import {
  db,
  purchasesTable,
  purchaseItemsTable,
  purchaseReturnsTable,
  purchaseReturnItemsTable,
  suppliersTable,
  productsTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function formatPurchase(p: typeof purchasesTable.$inferSelect & { supplierName: string }) {
  return {
    ...p,
    totalAmount: parseFloat(p.totalAmount),
    createdAt: p.createdAt.toISOString(),
  };
}

function formatItem(i: typeof purchaseItemsTable.$inferSelect & { productName: string }) {
  return {
    ...i,
    quantity: parseFloat(i.quantity),
    unitPrice: parseFloat(i.unitPrice),
    totalPrice: parseFloat(i.totalPrice),
  };
}

router.get("/purchases", requireAuth, async (req, res): Promise<void> => {
  const purchases = await db
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
    .orderBy(sql`${purchasesTable.purchaseDate} desc`);

  res.json(purchases.map(p => ({
    ...p,
    supplierName: p.supplierName ?? "",
    totalAmount: parseFloat(p.totalAmount),
    createdAt: p.createdAt.toISOString(),
  })));
});

router.post("/purchases", requireAuth, async (req, res): Promise<void> => {
  const { supplierId, purchaseDate, invoiceNo, notes, items } = req.body as {
    supplierId?: number;
    purchaseDate?: string;
    invoiceNo?: string | null;
    notes?: string | null;
    items?: Array<{ productId: number; quantity: number; unitPrice: number }>;
  };

  if (!supplierId || !purchaseDate || !items || items.length === 0) {
    res.status(400).json({ error: "supplierId, purchaseDate, and items are required" });
    return;
  }

  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  try {
    const result = await db.transaction(async (tx) => {
      const [purchase] = await tx
        .insert(purchasesTable)
        .values({
          supplierId,
          purchaseDate,
          invoiceNo: invoiceNo ?? null,
          totalAmount: String(totalAmount),
          status: "received",
          notes: notes ?? null,
        })
        .returning();

      const insertedItems = [];

      for (const item of items) {
        const [product] = await tx.select().from(productsTable).where(eq(productsTable.id, item.productId));
        if (!product) {
          throw new Error(`Product not found (ID: ${item.productId})`);
        }
        const productName = product.name;

        const [pi] = await tx
          .insert(purchaseItemsTable)
          .values({
            purchaseId: purchase.id,
            productId: item.productId,
            quantity: String(item.quantity),
            unitPrice: String(item.unitPrice),
            totalPrice: String(item.quantity * item.unitPrice),
          })
          .returning();

        await tx
          .update(productsTable)
          .set({
            currentStock: sql`${productsTable.currentStock} + ${String(item.quantity)}`,
          })
          .where(eq(productsTable.id, item.productId));

        insertedItems.push({ ...pi, productName });
      }

      const [supplier] = await tx.select().from(suppliersTable).where(eq(suppliersTable.id, supplierId));

      return {
        purchase,
        supplierName: supplier?.name ?? "",
        items: insertedItems,
      };
    });

    res.status(201).json({
      ...result.purchase,
      supplierName: result.supplierName,
      totalAmount: parseFloat(result.purchase.totalAmount),
      createdAt: result.purchase.createdAt.toISOString(),
      items: result.items.map(formatItem),
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("Product not found")) {
      res.status(400).json({ error: err.message });
      return;
    }
    logger.error({ err }, "Error creating purchase");
    res.status(500).json({ error: "Failed to save purchase due to database error" });
  }
});

router.get("/purchases/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid purchase ID" });
    return;
  }

  const [purchase] = await db
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
    .where(eq(purchasesTable.id, id));

  if (!purchase) {
    res.status(404).json({ error: "Purchase not found" });
    return;
  }

  const rawItems = await db
    .select({
      id: purchaseItemsTable.id,
      purchaseId: purchaseItemsTable.purchaseId,
      productId: purchaseItemsTable.productId,
      quantity: purchaseItemsTable.quantity,
      unitPrice: purchaseItemsTable.unitPrice,
      totalPrice: purchaseItemsTable.totalPrice,
      productName: productsTable.name,
    })
    .from(purchaseItemsTable)
    .leftJoin(productsTable, eq(purchaseItemsTable.productId, productsTable.id))
    .where(eq(purchaseItemsTable.purchaseId, id));

  res.json({
    ...purchase,
    supplierName: purchase.supplierName ?? "",
    totalAmount: parseFloat(purchase.totalAmount),
    createdAt: purchase.createdAt.toISOString(),
    items: rawItems.map(i => ({
      ...i,
      productName: i.productName ?? "",
      quantity: parseFloat(i.quantity),
      unitPrice: parseFloat(i.unitPrice),
      totalPrice: parseFloat(i.totalPrice),
    })),
  });
});

router.delete("/purchases/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid purchase ID" });
    return;
  }

  try {
    await db.transaction(async (tx) => {
      // Fetch items first so we can revert their stock after deletion
      const items = await tx
        .select({ productId: purchaseItemsTable.productId, quantity: purchaseItemsTable.quantity })
        .from(purchaseItemsTable)
        .where(eq(purchaseItemsTable.purchaseId, id));

      const [purchase] = await tx.delete(purchasesTable).where(eq(purchasesTable.id, id)).returning();

      if (!purchase) {
        throw new Error("Purchase not found");
      }

      // Revert stock: each item that was purchased must be decremented back
      for (const item of items) {
        await tx
          .update(productsTable)
          .set({
            currentStock: sql`GREATEST(0, ${productsTable.currentStock} - ${item.quantity})`,
          })
          .where(eq(productsTable.id, item.productId));
      }
    });

    res.sendStatus(204);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "Purchase not found") {
      res.status(404).json({ error: "Purchase not found" });
      return;
    }
    if (typeof err === "object" && err !== null && (err as { code?: string }).code === "23503") {
      res.status(400).json({ error: "This purchase cannot be deleted because it is referenced in returns or other records." });
      return;
    }
    logger.error({ err }, "Error deleting purchase");
    res.status(500).json({ error: "Failed to delete purchase due to database error" });
  }
});

export default router;
