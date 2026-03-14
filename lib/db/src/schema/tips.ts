import { pgTable, text, serial, integer, timestamp, numeric, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users.js";
import { postsTable } from "./posts.js";

export const tipApplicationStatusEnum = pgEnum("tip_application_status", ["pending", "approved", "rejected"]);
export const tipPaymentStatusEnum = pgEnum("tip_payment_status", ["waiting", "confirming", "confirmed", "sending", "partially_paid", "finished", "failed", "refunded", "expired"]);

export const tipApplicationsTable = pgTable("tip_applications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  status: tipApplicationStatusEnum("status").notNull().default("pending"),
  rejectionReason: text("rejection_reason"),
  reviewedBy: integer("reviewed_by").references(() => usersTable.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tipsTable = pgTable("tips", {
  id: serial("id").primaryKey(),
  fromUserId: integer("from_user_id").references(() => usersTable.id, { onDelete: "set null" }),
  toUserId: integer("to_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  postId: integer("post_id").references(() => postsTable.id, { onDelete: "set null" }),
  amountUsd: numeric("amount_usd", { precision: 10, scale: 2 }).notNull(),
  cryptoAmount: numeric("crypto_amount", { precision: 20, scale: 8 }),
  cryptoCurrency: text("crypto_currency").notNull(),
  nowPaymentId: text("now_payment_id").unique(),
  payAddress: text("pay_address"),
  status: tipPaymentStatusEnum("status").notNull().default("waiting"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type TipApplication = typeof tipApplicationsTable.$inferSelect;
export type Tip = typeof tipsTable.$inferSelect;
