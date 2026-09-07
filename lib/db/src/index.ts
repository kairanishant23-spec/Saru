import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.warn(
    "[WARN] DATABASE_URL is not set. Ensure DATABASE_URL is configured in environment variables.",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || undefined,
});
export const db = drizzle(pool, { schema });

export * from "./schema";
