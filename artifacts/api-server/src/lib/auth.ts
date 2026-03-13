import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || "memehub-secret-key-change-in-production";

export function signToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): { userId: number } {
  return jwt.verify(token, JWT_SECRET) as { userId: number };
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized", message: "No token provided" });
    return;
  }

  const token = authHeader.substring(7);
  try {
    const payload = verifyToken(token);
    const user = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId)).limit(1);
    if (!user.length) {
      res.status(401).json({ error: "Unauthorized", message: "User not found" });
      return;
    }
    if (user[0].isBanned) {
      res.status(403).json({ error: "Forbidden", message: "User is banned" });
      return;
    }
    (req as any).user = user[0];
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized", message: "Invalid token" });
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next();
    return;
  }
  const token = authHeader.substring(7);
  try {
    const payload = verifyToken(token);
    const user = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId)).limit(1);
    if (user.length && !user[0].isBanned) {
      (req as any).user = user[0];
    }
  } catch {
    // ignore
  }
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  await authenticate(req, res, async () => {
    const user = (req as any).user;
    if (user?.role !== "admin" && user?.role !== "moderator") {
      res.status(403).json({ error: "Forbidden", message: "Admin access required" });
      return;
    }
    next();
  });
}
