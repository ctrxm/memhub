import { pgTable, text, serial, integer, timestamp, numeric, pgEnum, boolean } from "drizzle-orm/pg-core";
import { usersTable } from "./users.js";

export const taskStatusEnum = pgEnum("task_status", ["active", "paused", "completed"]);
export const taskCompletionStatusEnum = pgEnum("task_completion_status", ["submitted", "approved", "rejected"]);
export const unlockPaymentStatusEnum = pgEnum("unlock_payment_status", ["pending", "completed", "expired", "failed"]);

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  instructions: text("instructions").notNull(),
  rewardUsd: numeric("reward_usd", { precision: 10, scale: 2 }).notNull(),
  maxCompletions: integer("max_completions").notNull().default(100),
  completionsCount: integer("completions_count").notNull().default(0),
  status: taskStatusEnum("status").notNull().default("active"),
  createdBy: integer("created_by").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const taskCompletionsTable = pgTable("task_completions", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull().references(() => tasksTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  proofText: text("proof_text"),
  proofUrl: text("proof_url"),
  status: taskCompletionStatusEnum("status").notNull().default("submitted"),
  rejectReason: text("reject_reason"),
  rewardPaid: boolean("reward_paid").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const taskUnlockPaymentsTable = pgTable("task_unlock_payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  amountUsd: numeric("amount_usd", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull(),           // USDTBSC | BNB
  plisioTxnId: text("plisio_txn_id").unique(),
  payAddress: text("pay_address"),
  invoiceUrl: text("invoice_url"),
  status: unlockPaymentStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Task = typeof tasksTable.$inferSelect;
export type TaskCompletion = typeof taskCompletionsTable.$inferSelect;
export type TaskUnlockPayment = typeof taskUnlockPaymentsTable.$inferSelect;
