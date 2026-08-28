import { Router, type IRouter } from "express";
import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return `pbkdf2$100000$${salt}$${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash.includes("$")) {
    const legacyHash = createHash("sha256").update(password + "himsaru_salt").digest("hex");
    return legacyHash === storedHash;
  }

  const parts = storedHash.split("$");
  if (parts.length !== 4) return false;
  const [algo, iterationsStr, salt, hash] = parts;
  if (algo !== "pbkdf2") return false;
  const iterations = parseInt(iterationsStr, 10);
  if (isNaN(iterations)) return false;
  const verifyHash = pbkdf2Sync(password, salt, iterations, 64, "sha512").toString("hex");
  const verifyBuffer = Buffer.from(verifyHash, "hex");
  const storedBuffer = Buffer.from(hash, "hex");
  if (verifyBuffer.length !== storedBuffer.length) return false;
  return timingSafeEqual(verifyBuffer, storedBuffer);
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email));

  if (!user || !verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  // Migrate hash if legacy
  if (!user.passwordHash.includes("$")) {
    try {
      const migratedHash = hashPassword(password);
      await db
        .update(usersTable)
        .set({ passwordHash: migratedHash })
        .where(eq(usersTable.id, user.id));
      user.passwordHash = migratedHash;
    } catch (err) {
      logger.error({ err }, "Failed to migrate password hash");
    }
  }

  req.session.userId = user.id;
  req.session.userEmail = user.email;
  req.session.userName = user.name;
  req.session.userRole = user.role;

  // Explicitly flush the session to the store before responding. With an async
  // store (pg) express-session doesn't guarantee the write completes before
  // res.json() returns, so the client gets a cookie for a session that isn't in
  // the DB yet — every subsequent request would then return 401.
  await new Promise<void>((resolve, reject) =>
    req.session.save((err) => (err ? reject(err) : resolve()))
  );

  req.log.info({ userId: user.id }, "User logged in");

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  req.session.destroy((err) => {
    if (err) {
      logger.error({ err }, "Session destroy error");
      res.status(500).json({ error: "Failed to log out" });
      return;
    }
    res.clearCookie("connect.sid");
    res.json({ message: "Logged out" });
  });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId));

  if (!user) {
    req.session.destroy(() => {});
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
});

export default router;
