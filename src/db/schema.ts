import {
  pgSchema,
  serial,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const easyclawSchema = pgSchema("easyclaw");

// Users table
export const users = easyclawSchema.table(
  "users",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    uuid: varchar({ length: 255 }).notNull().unique(),
    email: varchar({ length: 255 }).notNull(),
    created_at: timestamp({ withTimezone: true }),
    nickname: varchar({ length: 255 }),
    avatar_url: varchar({ length: 255 }),
    locale: varchar({ length: 50 }),
    signin_type: varchar({ length: 50 }),
    signin_ip: varchar({ length: 255 }),
    signin_provider: varchar({ length: 50 }),
    signin_openid: varchar({ length: 255 }),
    invite_code: varchar({ length: 255 }).notNull().default(""),
    updated_at: timestamp({ withTimezone: true }),
    invited_by: varchar({ length: 255 }).notNull().default(""),
    is_affiliate: boolean().notNull().default(false),
  },
  (table) => [
    uniqueIndex("email_provider_unique_idx").on(
      table.email,
      table.signin_provider
    ),
  ]
);

// Orders table
export const orders = easyclawSchema.table("orders", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  order_no: varchar({ length: 255 }).notNull().unique(),
  created_at: timestamp({ withTimezone: true }),
  user_uuid: varchar({ length: 255 }).notNull().default(""),
  user_email: varchar({ length: 255 }).notNull().default(""),
  amount: integer().notNull(),
  interval: varchar({ length: 50 }),
  expired_at: timestamp({ withTimezone: true }),
  status: varchar({ length: 50 }).notNull(),
  stripe_session_id: varchar({ length: 255 }),
  credits: integer().notNull(),
  currency: varchar({ length: 50 }),
  sub_id: varchar({ length: 255 }),
  sub_interval_count: integer(),
  sub_cycle_anchor: integer(),
  sub_period_end: integer(),
  sub_period_start: integer(),
  sub_times: integer(),
  product_id: varchar({ length: 255 }),
  product_name: varchar({ length: 255 }),
  valid_months: integer(),
  order_detail: text(),
  paid_at: timestamp({ withTimezone: true }),
  paid_email: varchar({ length: 255 }),
  paid_detail: text(),
});

// Waitlist table
export const waitlist = easyclawSchema.table(
  "waitlist",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar({ length: 255 }).notNull(),
    created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
    notified_at: timestamp({ withTimezone: true }),
    status: varchar({ length: 50 }).notNull().default("pending"),
  },
  (table) => [uniqueIndex("waitlist_email_unique_idx").on(table.email)]
);

// API Keys table
export const apikeys = easyclawSchema.table("apikeys", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  api_key: varchar({ length: 255 }).notNull().unique(),
  title: varchar({ length: 100 }),
  user_uuid: varchar({ length: 255 }).notNull(),
  created_at: timestamp({ withTimezone: true }),
  status: varchar({ length: 50 }),
});

// Credits table
export const credits = easyclawSchema.table("credits", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  trans_no: varchar({ length: 255 }).notNull().unique(),
  created_at: timestamp({ withTimezone: true }),
  user_uuid: varchar({ length: 255 }).notNull(),
  trans_type: varchar({ length: 50 }).notNull(),
  credits: integer().notNull(),
  order_no: varchar({ length: 255 }),
  expired_at: timestamp({ withTimezone: true }),
});

// Posts table
export const posts = easyclawSchema.table("posts", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  uuid: varchar({ length: 255 }).notNull().unique(),
  slug: varchar({ length: 255 }),
  title: varchar({ length: 255 }),
  description: text(),
  content: text(),
  created_at: timestamp({ withTimezone: true }),
  updated_at: timestamp({ withTimezone: true }),
  status: varchar({ length: 50 }),
  cover_url: varchar({ length: 255 }),
  author_name: varchar({ length: 255 }),
  author_avatar_url: varchar({ length: 255 }),
  locale: varchar({ length: 50 }),
});

// Affiliates table
export const affiliates = easyclawSchema.table("affiliates", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  user_uuid: varchar({ length: 255 }).notNull(),
  created_at: timestamp({ withTimezone: true }),
  status: varchar({ length: 50 }).notNull().default(""),
  invited_by: varchar({ length: 255 }).notNull(),
  paid_order_no: varchar({ length: 255 }).notNull().default(""),
  paid_amount: integer().notNull().default(0),
  reward_percent: integer().notNull().default(0),
  reward_amount: integer().notNull().default(0),
});

// Feedbacks table
export const feedbacks = easyclawSchema.table("feedbacks", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  created_at: timestamp({ withTimezone: true }),
  status: varchar({ length: 50 }),
  user_uuid: varchar({ length: 255 }),
  content: text(),
  rating: integer(),
});

// Wallpapers table
export const wallpapers = easyclawSchema.table("wallpapers", {
  id: serial("id").primaryKey(),
  uuid: varchar({ length: 255 }).notNull().unique(),
  user_uuid: varchar({ length: 255 }),
  created_at: timestamp({ withTimezone: true }),
  img_description: text(),
  img_url: varchar({ length: 255 }),
  status: varchar({ length: 50 }),
});

// Outfits table
export const outfits = easyclawSchema.table("outfits", {
  id: serial("id").primaryKey(),
  uuid: varchar({ length: 255 }).notNull().unique(),
  user_uuid: varchar({ length: 255 }),
  created_at: timestamp({ withTimezone: true }),
  base_image_url: varchar({ length: 255 }),
  img_description: text(),
  img_url: varchar({ length: 255 }),
  status: varchar({ length: 50 }),
});

// Error Logs table
export const errorLogs = easyclawSchema.table("error_logs", {
  id: serial("id").primaryKey(),
  request_id: varchar({ length: 255 }).notNull(),
  user_id: varchar({ length: 255 }),
  api_path: varchar({ length: 255 }),
  error_msg: text(),
  stack_trace: text(),
  created_at: timestamp({ withTimezone: true }).defaultNow(),
});

// Deployments table (for OpenClaw deployment feature)
export const deployments = easyclawSchema.table("deployments", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: varchar({ length: 255 }).notNull(),
  account_id: uuid("account_id"),
  status: varchar({ length: 50 }).notNull().default("provisioning"),
  channel_type: varchar({ length: 50 }).notNull().default("telegram"),
  channel_token_encrypted: text(),
  telegram_token_encrypted: text().notNull(),
  target_host: text(),
  error_message: text(),
  requested_model: text(),
  resolved_model: text(),
  subscription_order_no: text(),
  consumed_success: boolean().notNull().default(false),
  consumed_at: timestamp({ withTimezone: true }),
  stopped_at: timestamp({ withTimezone: true }),
  stop_reason: varchar({ length: 50 }),
  created_at: timestamp({ withTimezone: true }).defaultNow(),
  updated_at: timestamp({ withTimezone: true }).defaultNow(),
});

// Account Pool table (for OpenAI account management)
export const accountPool = easyclawSchema.table("account_pool", {
  id: uuid("id").primaryKey().defaultRandom(),
  access_token_encrypted: text("access_token_encrypted").notNull(),
  refresh_token_encrypted: text("refresh_token_encrypted").notNull(),
  expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
  account_id: varchar("account_id", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }),
  is_bound: boolean("is_bound").notNull().default(false),
  bound_user_id: varchar("bound_user_id", { length: 255 }),
  bound_at: timestamp("bound_at", { withTimezone: true }),
  is_active: boolean("is_active").notNull().default(true),
  failure_count: integer("failure_count").notNull().default(0),
  last_used_at: timestamp("last_used_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Account unbind logs (for audit)
export const accountUnbindLogs = easyclawSchema.table("account_unbind_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  account_id: uuid("account_id").notNull(),
  previous_user_id: varchar("previous_user_id", { length: 255 }).notNull(),
  reason: text("reason"),
  stopped_deployments: integer("stopped_deployments").default(0),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Manual payment requests (for Alipay/WeChat QR code payments)
export const manualPaymentRequests = easyclawSchema.table("manual_payment_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  order_no: varchar("order_no", { length: 255 }).notNull().unique(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  user_uuid: varchar("user_uuid", { length: 255 }).notNull(),
  user_email: varchar("user_email", { length: 255 }).notNull(),
  amount: integer().notNull(), // Amount in CNY (fen)
  product_id: varchar("product_id", { length: 255 }).notNull(),
  product_name: varchar("product_name", { length: 255 }),
  credits: integer().notNull().default(0),
  valid_months: integer(),
  interval: varchar("interval", { length: 50 }),
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, approved, rejected
  payment_method: varchar("payment_method", { length: 50 }), // alipay, wechat
  transaction_id: varchar("transaction_id", { length: 255 }), // User provided transaction ID
  paid_at: timestamp("paid_at", { withTimezone: true }),
  reviewed_at: timestamp("reviewed_at", { withTimezone: true }),
  reviewed_by: varchar("reviewed_by", { length: 255 }),
  notes: text(),
});
