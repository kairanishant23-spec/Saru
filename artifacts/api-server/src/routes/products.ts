import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, productsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function formatProduct(p: typeof productsTable.$inferSelect) {
  return {
    ...p,
    purchasePrice: parseFloat(p.purchasePrice),
    sellingPrice: parseFloat(p.sellingPrice),
    currentStock: parseFloat(p.currentStock),
    minStock: parseFloat(p.minStock),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

router.get("/products", requireAuth, async (req, res): Promise<void> => {
  const products = await db.select().from(productsTable).orderBy(productsTable.name);
  res.json(products.map(formatProduct));
});

router.post("/products", requireAuth, async (req, res): Promise<void> => {
  const { name, sku, category, unit, purchasePrice, sellingPrice, currentStock, minStock } = req.body as {
    name?: string;
    sku?: string | null;
    category?: string | null;
    unit?: string;
    purchasePrice?: number;
    sellingPrice?: number;
    currentStock?: number;
    minStock?: number;
  };

  if (!name || unit == null || purchasePrice == null || sellingPrice == null || currentStock == null || minStock == null) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const [product] = await db
    .insert(productsTable)
    .values({
      name,
      sku: sku ?? null,
      category: category ?? null,
      unit,
      purchasePrice: String(purchasePrice),
      sellingPrice: String(sellingPrice),
      currentStock: String(currentStock),
      minStock: String(minStock),
    })
    .returning();

  res.status(201).json(formatProduct(product));
});

router.get("/products/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid product ID" });
    return;
  }

  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id));

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.json(formatProduct(product));
});

router.put("/products/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid product ID" });
    return;
  }

  const { name, sku, category, unit, purchasePrice, sellingPrice, minStock } = req.body as {
    name?: string;
    sku?: string | null;
    category?: string | null;
    unit?: string;
    purchasePrice?: number;
    sellingPrice?: number;
    minStock?: number;
  };

  if (!name || unit == null || purchasePrice == null || sellingPrice == null || minStock == null) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const [product] = await db
    .update(productsTable)
    .set({
      name,
      sku: sku ?? null,
      category: category ?? null,
      unit,
      purchasePrice: String(purchasePrice),
      sellingPrice: String(sellingPrice),
      minStock: String(minStock),
    })
    .where(eq(productsTable.id, id))
    .returning();

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.json(formatProduct(product));
});

router.delete("/products/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid product ID" });
    return;
  }

  try {
    const [product] = await db.delete(productsTable).where(eq(productsTable.id, id)).returning();

    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    res.sendStatus(204);
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && (err as { code?: string }).code === "23503") {
      res.status(400).json({ error: "This product cannot be deleted because it is referenced in past transactions." });
      return;
    }
    logger.error({ err }, "Error deleting product");
    res.status(500).json({ error: "Failed to delete product due to database error" });
  }
});

export default router;
