import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, settingsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

async function getOrCreate() {
  const [existing] = await db.select().from(settingsTable).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(settingsTable).values({}).returning();
  return created;
}

router.get("/settings", requireAuth, async (req, res): Promise<void> => {
  const settings = await getOrCreate();
  res.json({ ...settings, updatedAt: settings.updatedAt.toISOString() });
});

router.put("/settings", requireAuth, async (req, res): Promise<void> => {
  const { businessName, businessLegalName, gstin, address, city, state, pincode, phone, email, logoData } = req.body as {
    businessName?: string;
    businessLegalName?: string | null;
    gstin?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    pincode?: string | null;
    phone?: string | null;
    email?: string | null;
    logoData?: string | null;
  };

  if (!businessName || !businessName.trim()) {
    res.status(400).json({ error: "businessName is required" });
    return;
  }

  const existing = await getOrCreate();

  const [updated] = await db
    .update(settingsTable)
    .set({
      businessName: businessName.trim(),
      businessLegalName: businessLegalName ?? null,
      gstin: gstin ?? null,
      address: address ?? null,
      city: city ?? null,
      state: state ?? null,
      pincode: pincode ?? null,
      phone: phone ?? null,
      email: email ?? null,
      ...(logoData !== undefined ? { logoData } : {}),
    })
    .where(eq(settingsTable.id, existing.id))
    .returning();

  res.json({ ...updated, updatedAt: updated.updatedAt.toISOString() });
});

export default router;
