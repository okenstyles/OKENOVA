import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const okenovaRole = pgEnum("okenova_role", ["customer", "owner", "staff"]);
export const okenovaOrderStatus = pgEnum("okenova_order_status", [
  "pending",
  "in_progress",
  "completed",
]);

export const okenovaUsers = pgTable("okenova_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  role: okenovaRole("role").notNull().default("customer"),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const okenovaServices = pgTable("okenova_services", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  priceLabel: text("price_label"),
  available: boolean("available").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const okenovaConversations = pgTable(
  "okenova_conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => okenovaUsers.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("okenova_conversations_customer_unique").on(table.customerId),
  ],
);

export const okenovaMessages = pgTable(
  "okenova_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => okenovaConversations.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => okenovaUsers.id, { onDelete: "restrict" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("okenova_messages_conversation_created_idx").on(
      table.conversationId,
      table.createdAt,
    ),
  ],
);

export const okenovaOrders = pgTable(
  "okenova_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => okenovaServices.id, { onDelete: "restrict" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => okenovaUsers.id, { onDelete: "restrict" }),
    details: text("details").notNull(),
    status: okenovaOrderStatus("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("okenova_orders_customer_status_idx").on(
      table.customerId,
      table.status,
    ),
  ],
);

export const okenovaAnnouncements = pgTable("okenova_announcements", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => okenovaUsers.id, { onDelete: "restrict" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  publishedAt: timestamp("published_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const okenovaUserRelations = relations(okenovaUsers, ({ many }) => ({
  conversations: many(okenovaConversations),
  messages: many(okenovaMessages),
  orders: many(okenovaOrders),
  announcements: many(okenovaAnnouncements),
}));

export const okenovaConversationRelations = relations(
  okenovaConversations,
  ({ one, many }) => ({
    customer: one(okenovaUsers, {
      fields: [okenovaConversations.customerId],
      references: [okenovaUsers.id],
    }),
    messages: many(okenovaMessages),
  }),
);

export const okenovaMessageRelations = relations(okenovaMessages, ({ one }) => ({
  conversation: one(okenovaConversations, {
    fields: [okenovaMessages.conversationId],
    references: [okenovaConversations.id],
  }),
  sender: one(okenovaUsers, {
    fields: [okenovaMessages.senderId],
    references: [okenovaUsers.id],
  }),
}));

export const okenovaOrderRelations = relations(okenovaOrders, ({ one }) => ({
  customer: one(okenovaUsers, {
    fields: [okenovaOrders.customerId],
    references: [okenovaUsers.id],
  }),
  service: one(okenovaServices, {
    fields: [okenovaOrders.serviceId],
    references: [okenovaServices.id],
  }),
}));

export const okenovaAnnouncementRelations = relations(
  okenovaAnnouncements,
  ({ one }) => ({
    owner: one(okenovaUsers, {
      fields: [okenovaAnnouncements.ownerId],
      references: [okenovaUsers.id],
    }),
  }),
);

export type OkenovaUser = typeof okenovaUsers.$inferSelect;
export type OkenovaService = typeof okenovaServices.$inferSelect;
export type OkenovaConversation = typeof okenovaConversations.$inferSelect;
export type OkenovaMessage = typeof okenovaMessages.$inferSelect;
export type OkenovaOrder = typeof okenovaOrders.$inferSelect;
export type OkenovaAnnouncement = typeof okenovaAnnouncements.$inferSelect;
