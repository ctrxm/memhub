import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { postsTable } from "./posts.js";

export const tagsTable = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  color: text("color"),
  postsCount: integer("posts_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const postTagsTable = pgTable("post_tags", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => postsTable.id, { onDelete: "cascade" }),
  tagId: integer("tag_id").notNull().references(() => tagsTable.id, { onDelete: "cascade" }),
});

export type Tag = typeof tagsTable.$inferSelect;
