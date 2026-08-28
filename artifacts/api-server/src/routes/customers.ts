import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, customersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function formatCustomer(c: typeof customersTable.$inferSelect) {
  return {
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

router.get("/customers", requireAuth, async (req, res): Promise<void> => {
  const customers = await db.select().from(customersTable).orderBy(customersTable.name);
  res.json(customers.map(formatCustomer));
});

router.post("/customers", requireAuth, async (req, res): Promise<void> => {
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

  const [customer] = await db
    .insert(customersTable)
    .values({ name, contactPerson: contactPerson ?? null, phone: phone ?? null, email: email ?? null, address: address ?? null, gstin: gstin ?? null })
    .returning();

  res.status(201).json(formatCustomer(customer));
});

router.get("/customers/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, id));

  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  res.json(formatCustomer(customer));
});

router.put("/customers/:id", requireAuth, async (req, res): Promise<void> => {
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

  const [customer] = await db
    .update(customersTable)
    .set({ name, contactPerson: contactPerson ?? null, phone: phone ?? null, email: email ?? null, address: address ?? null, gstin: gstin ?? null })
    .where(eq(customersTable.id, id))
    .returning();

  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  res.json(formatCustomer(customer));
});

router.delete("/customers/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [customer] = await db.delete(customersTable).where(eq(customersTable.id, id)).returning();

  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
