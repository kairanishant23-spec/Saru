import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, suppliersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/suppliers", requireAuth, async (req, res): Promise<void> => {
  const suppliers = await db
    .select()
    .from(suppliersTable)
    .orderBy(suppliersTable.name);
  res.json(suppliers.map(s => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  })));
});

router.post("/suppliers", requireAuth, async (req, res): Promise<void> => {
  const { name, contactPerson, phone, email, address, gstin } = req.body as {
    name?: string;
    contactPerson?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    gstin?: string | null;
  };

  if (!name) {
    res.status(400).json({ error: "Name is required" });
    return;
  }

  const [supplier] = await db
    .insert(suppliersTable)
    .values({ name, contactPerson: contactPerson ?? null, phone: phone ?? null, email: email ?? null, address: address ?? null, gstin: gstin ?? null })
    .returning();

  res.status(201).json({
    ...supplier,
    createdAt: supplier.createdAt.toISOString(),
    updatedAt: supplier.updatedAt.toISOString(),
  });
});

router.get("/suppliers/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [supplier] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, id));

  if (!supplier) {
    res.status(404).json({ error: "Supplier not found" });
    return;
  }

  res.json({
    ...supplier,
    createdAt: supplier.createdAt.toISOString(),
    updatedAt: supplier.updatedAt.toISOString(),
  });
});

router.put("/suppliers/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const { name, contactPerson, phone, email, address, gstin } = req.body as {
    name?: string;
    contactPerson?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    gstin?: string | null;
  };

  if (!name) {
    res.status(400).json({ error: "Name is required" });
    return;
  }

  const [supplier] = await db
    .update(suppliersTable)
    .set({ name, contactPerson: contactPerson ?? null, phone: phone ?? null, email: email ?? null, address: address ?? null, gstin: gstin ?? null })
    .where(eq(suppliersTable.id, id))
    .returning();

  if (!supplier) {
    res.status(404).json({ error: "Supplier not found" });
    return;
  }

  res.json({
    ...supplier,
    createdAt: supplier.createdAt.toISOString(),
    updatedAt: supplier.updatedAt.toISOString(),
  });
});

router.delete("/suppliers/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [supplier] = await db
    .delete(suppliersTable)
    .where(eq(suppliersTable.id, id))
    .returning();

  if (!supplier) {
    res.status(404).json({ error: "Supplier not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
