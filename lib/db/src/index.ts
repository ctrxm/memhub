import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";

const { Pool } = pg;

const connectionString =
  process.env.SUPABASE_DATABASE_URL ||
  process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    "[db] WARNING: DATABASE_URL is not set. Database queries will fail.",
  );
}

export const pool = new Pool({
  connectionString: connectionString || "postgres://localhost/unconfigured",
  ssl: { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  console.error("[db] Unexpected pool error:", err.message);
});

export const db = drizzle(pool, { schema });

export * from "./schema/index.js";
