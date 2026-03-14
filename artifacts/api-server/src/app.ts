import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import router from "./routes/index.js";
import path from "path";
import { existsSync } from "fs";
import { db, siteSettingsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { verifyToken } from "./lib/auth.js";
import { maintenanceCache, invalidateMaintenanceCache } from "./lib/maintenance-cache.js";

export { invalidateMaintenanceCache };

const app: Express = express();

const allowedOriginsList = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim())
  : null;

app.use(cors({
  origin: (origin, callback) => {
    // Always allow same-origin / non-browser requests (no Origin header)
    if (!origin) return callback(null, true);
    // If no whitelist configured, allow all origins
    if (!allowedOriginsList) return callback(null, true);
    // Otherwise check whitelist
    if (allowedOriginsList.includes(origin)) return callback(null, true);
    // Rejected — don't throw, just return false so CORS headers are omitted
    callback(null, false);
  },
  credentials: true,
}));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());

// Maintenance mode — re-check Supabase every 15 seconds, cache in memory
async function isMaintenanceOn(): Promise<boolean> {
  const now = Date.now();
  if (now - maintenanceCache.ts < 15_000) return maintenanceCache.value;
  try {
    const [settings] = await db.select({ maintenanceMode: siteSettingsTable.maintenanceMode })
      .from(siteSettingsTable).limit(1);
    maintenanceCache.value = settings?.maintenanceMode ?? false;
    maintenanceCache.ts = now;
    return maintenanceCache.value;
  } catch {
    return maintenanceCache.value;
  }
}

// Maintenance mode middleware — runs before all API routes
// Exempt: /api/status and /api/auth/login so admins can always log in
const MAINTENANCE_EXEMPT = ["/api/status", "/api/auth/login"];

app.use(async (req: Request, res: Response, next: NextFunction) => {
  if (MAINTENANCE_EXEMPT.some(p => req.path === p)) return next();

  const maintenance = await isMaintenanceOn();
  if (!maintenance) return next();

  // Allow admins through
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const payload = verifyToken(authHeader.substring(7));
      const [user] = await db.select({ role: usersTable.role })
        .from(usersTable).where(eq(usersTable.id, payload.userId)).limit(1);
      if (user?.role === "admin") return next();
    } catch {
      // invalid token — fall through to 503
    }
  }

  res.status(503).json({ maintenanceMode: true, message: "Site is currently under maintenance. Please check back soon." });
});

app.use("/api", router);

// In production, serve the React frontend from the Vite build output
if (process.env.NODE_ENV === "production") {
  const frontendDist = path.join(process.cwd(), "artifacts", "memehub", "dist");
  if (existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    // SPA fallback — let React Router handle all non-API routes
    app.get("*", (_req, res) => {
      res.sendFile(path.join(frontendDist, "index.html"));
    });
  }
}

export default app;
