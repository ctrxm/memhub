import { pgTable, text, serial, boolean, integer, timestamp } from "drizzle-orm/pg-core";

export const siteSettingsTable = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  siteName: text("site_name").notNull().default("MemeHub"),
  siteDescription: text("site_description").notNull().default("The best place for memes"),
  allowRegistration: boolean("allow_registration").notNull().default(true),
  requireApproval: boolean("require_approval").notNull().default(false),
  maxUploadSizeMb: integer("max_upload_size_mb").notNull().default(10),
  allowedFileTypes: text("allowed_file_types").notNull().default("jpg,jpeg,png,gif,webp,mp4"),
  huggingFaceRepo: text("hugging_face_repo").notNull().default(""),
  maintenanceMode: boolean("maintenance_mode").notNull().default(false),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type SiteSettings = typeof siteSettingsTable.$inferSelect;
