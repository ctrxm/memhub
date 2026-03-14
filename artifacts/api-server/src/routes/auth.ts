import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, siteSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, authenticate } from "../lib/auth.js";
import { sendOtpEmail, generateOtp } from "../lib/email.js";

const router = Router();

async function isSmtpEnabled(): Promise<boolean> {
  try {
    const [settings] = await db.select({ smtpEnabled: siteSettingsTable.smtpEnabled }).from(siteSettingsTable).limit(1);
    return settings?.smtpEnabled ?? false;
  } catch {
    return false;
  }
}

router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({ error: "Bad Request", message: "All fields required" });
      return;
    }

    if (username.length < 3 || username.length > 30) {
      res.status(400).json({ error: "Bad Request", message: "Username must be 3-30 characters" });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: "Bad Request", message: "Password must be at least 6 characters" });
      return;
    }

    const existing = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (existing.length) {
      res.status(400).json({ error: "Bad Request", message: "Email already registered" });
      return;
    }

    const existingUsername = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.username, username))
      .limit(1);

    if (existingUsername.length) {
      res.status(400).json({ error: "Bad Request", message: "Username already taken" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // First user becomes admin
    const userCount = await db.$count(usersTable);
    const role = userCount === 0 ? "admin" : "user";

    const smtpOn = await isSmtpEnabled();

    if (smtpOn) {
      const otp = generateOtp();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

      await db.insert(usersTable).values({
        username,
        email,
        passwordHash,
        role,
        emailVerified: false,
        verificationOtp: otp,
        otpExpiry,
      });

      try {
        await sendOtpEmail(email, username, otp);
      } catch (emailErr) {
        console.error("Failed to send OTP email:", emailErr);
        console.log(`[DEBUG] OTP for ${email}: ${otp}`);
      }

      res.status(202).json({
        requireOtp: true,
        email,
        message: "Verification code sent to your email.",
      });
    } else {
      const [user] = await db.insert(usersTable).values({
        username,
        email,
        passwordHash,
        role,
        emailVerified: true,
      }).returning();

      const token = signToken(user.id);
      res.status(201).json({
        user: formatUser(user, 0, 0, false),
        token,
      });
    }
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Internal Server Error", message: "Registration failed" });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400).json({ error: "Bad Request", message: "Email and OTP are required" });
      return;
    }

    const [user] = await db.select().from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "Not Found", message: "No account found with this email" });
      return;
    }

    if (user.emailVerified) {
      const token = signToken(user.id);
      res.json({ user: formatUser(user, 0, 0, false), token });
      return;
    }

    if (!user.verificationOtp || !user.otpExpiry) {
      res.status(400).json({ error: "Bad Request", message: "No OTP was requested for this account" });
      return;
    }

    if (new Date() > new Date(user.otpExpiry)) {
      res.status(400).json({ error: "Expired", message: "OTP has expired. Please register again." });
      return;
    }

    if (String(otp).trim() !== String(user.verificationOtp).trim()) {
      res.status(400).json({ error: "Invalid OTP", message: "The code you entered is incorrect. Please try again." });
      return;
    }

    await db.update(usersTable)
      .set({ emailVerified: true, verificationOtp: null, otpExpiry: null })
      .where(eq(usersTable.id, user.id));

    const token = signToken(user.id);

    res.json({
      user: formatUser({ ...user, emailVerified: true }, 0, 0, false),
      token,
    });
  } catch (err) {
    console.error("Verify OTP error:", err);
    res.status(500).json({ error: "Internal Server Error", message: "Verification failed" });
  }
});

router.post("/resend-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: "Bad Request", message: "Email is required" });
      return;
    }

    const [user] = await db.select().from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "Not Found", message: "No account found with this email" });
      return;
    }

    if (user.emailVerified) {
      res.status(400).json({ error: "Bad Request", message: "Email already verified" });
      return;
    }

    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await db.update(usersTable)
      .set({ verificationOtp: otp, otpExpiry })
      .where(eq(usersTable.id, user.id));

    try {
      await sendOtpEmail(email, user.username, otp);
    } catch (emailErr) {
      console.error("Failed to resend OTP:", emailErr);
      console.log(`[DEBUG] Resend OTP for ${email}: ${otp}`);
    }

    res.json({ message: "Verification code resent successfully." });
  } catch (err) {
    console.error("Resend OTP error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Bad Request", message: "Email and password required" });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);

    if (!user) {
      res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
      return;
    }

    if (user.isBanned) {
      res.status(403).json({ error: "Forbidden", message: `Account banned: ${user.banReason || "Policy violation"}` });
      return;
    }

    const smtpOn = await isSmtpEnabled();
    if (smtpOn && !user.emailVerified) {
      res.status(403).json({
        error: "Email not verified",
        message: "Please verify your email before logging in.",
        requireOtp: true,
        email: user.email,
      });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
      return;
    }

    await db.update(usersTable).set({ lastActiveAt: new Date() }).where(eq(usersTable.id, user.id));

    const token = signToken(user.id);

    res.json({
      user: formatUser(user, 0, 0, false),
      token,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal Server Error", message: "Login failed" });
  }
});

router.post("/logout", (_req, res) => {
  res.json({ success: true, message: "Logged out" });
});

router.get("/me", authenticate, async (req, res) => {
  try {
    const user = (req as any).user;
    const { followersCount, followingCount } = await getUserFollowCounts(user.id);
    res.json(formatUser(user, followersCount, followingCount, false));
  } catch (err) {
    console.error("Get me error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

async function getUserFollowCounts(userId: number) {
  const { followsTable } = await import("@workspace/db");
  const { eq, sql } = await import("drizzle-orm");

  const [followers] = await db.select({ count: sql<number>`count(*)` })
    .from(followsTable)
    .where(eq(followsTable.followingId, userId));

  const [following] = await db.select({ count: sql<number>`count(*)` })
    .from(followsTable)
    .where(eq(followsTable.followerId, userId));

  return {
    followersCount: Number(followers?.count || 0),
    followingCount: Number(following?.count || 0),
  };
}

export function formatUser(user: any, followersCount: number, followingCount: number, isFollowing: boolean) {
  return {
    id: String(user.id),
    username: user.username,
    email: user.email,
    avatar: user.avatar || null,
    bio: user.bio || null,
    role: user.role,
    isBanned: user.isBanned,
    followersCount,
    followingCount,
    postsCount: 0,
    totalPoints: user.totalPoints,
    isFollowing,
    createdAt: user.createdAt,
  };
}

export default router;
