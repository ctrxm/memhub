import { defineConfig } from "drizzle-kit";
import path from "path";

const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL or SUPABASE_DATABASE_URL must be set");
}

export default defineConfig({
  schema: path.join(__dirname, "./dist/schema/index.js"),
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
    ssl: process.env.SUPABASE_DATABASE_URL ? "require" : undefined,
  } as any,
});
