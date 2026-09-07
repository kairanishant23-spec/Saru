import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, customersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function formatCustomer(c: typeof customersTable.$inferSelect) {
  return {
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

router.get("/customers", requireAuth, async (req, res): Promise<void> => {
  try {
    const customers = await db.select().from(customersTable).orderBy(customersTable.name);
    res.json(customers.map(formatCustomer));
  } catch (err) {
    logger.error({ err }, "Error fetching customers");
    res.status(500).json({ error: "Failed to fetch customers" });
  }
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

  try {
    const [customer] = await db
      .insert(customersTable)
      .values({ name, contactPerson: contactPerson ?? null, phone: phone ?? null, email: email ?? null, address: address ?? null, gstin: gstin ?? null })
      .returning();

    res.status(201).json(formatCustomer(customer));
  } catch (err) {
    logger.error({ err }, "Error creating customer");
    res.status(500).json({ error: "Failed to create customer" });
  }
});

router.get("/customers/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid customer ID" });
    return;
  }

  try {
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, id));

    if (!customer) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }

    res.json(formatCustomer(customer));
  } catch (err) {
    logger.error({ err }, "Error fetching customer");
    res.status(500).json({ error: "Failed to fetch customer" });
  }
});

router.put("/customers/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid customer ID" });
    return;
  }

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

  try {
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
  } catch (err) {
    logger.error({ err }, "Error updating customer");
    res.status(500).json({ error: "Failed to update customer" });
  }
});

router.delete("/customers/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid customer ID" });
    return;
  }

  try {
    const [customer] = await db.delete(customersTable).where(eq(customersTable.id, id)).returning();

    if (!customer) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }

    res.sendStatus(204);
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && (err as { code?: string }).code === "23503") {
      res.status(400).json({ error: "This customer cannot be deleted because they are referenced in existing sales." });
      return;
    }
    logger.error({ err }, "Error deleting customer");
    res.status(500).json({ error: "Failed to delete customer" });
  }
});

export default router;
