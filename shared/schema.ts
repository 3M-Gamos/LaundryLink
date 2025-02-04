import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const UserRole = {
  CUSTOMER: "customer",
  DELIVERY: "delivery",
  BUSINESS: "business",
} as const;

export const OrderStatus = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  PICKED_UP: "picked_up",
  IN_PROGRESS: "in_progress",
  READY: "ready",
  DELIVERING: "delivering",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
} as const;

export const LaundryItem = {
  SHIRT: "shirt",
  PANTS: "pants",
  DRESS: "dress",
  SUIT: "suit",
  COAT: "coat",
  BEDDING: "bedding",
  CURTAINS: "curtains",
} as const;

export type OrderItem = {
  item: keyof typeof LaundryItem;
  quantity: number;
  price: number;
};

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: Object.values(UserRole) }).notNull(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  address: text("address"),
  rating: integer("rating"),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull(),
  businessId: integer("business_id").notNull(),
  deliveryId: integer("delivery_id"),
  status: text("status", { enum: Object.values(OrderStatus) }).notNull(),
  items: jsonb("items").$type<OrderItem[]>().notNull(),
  pickupAddress: text("pickup_address").notNull(),
  deliveryAddress: text("delivery_address").notNull(),
  pickupTime: timestamp("pickup_time").notNull(),
  deliveryTime: timestamp("delivery_time").notNull(),
  price: integer("price").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const ratings = pgTable("ratings", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  fromUserId: integer("from_user_id").notNull(),
  toUserId: integer("to_user_id").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
});

export const orderItemSchema = z.object({
  item: z.enum(Object.keys(LaundryItem) as [keyof typeof LaundryItem, ...Array<keyof typeof LaundryItem>]),
  quantity: z.number().min(1),
  price: z.number().min(0),
});

export const insertOrderSchema = createInsertSchema(orders, {
  items: z.array(orderItemSchema),
  pickupTime: z.string().or(z.date()),
  deliveryTime: z.string().or(z.date()),
}).omit({
  id: true,
  deliveryId: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
  name: true,
  phone: true,
  address: true,
});

export const insertRatingSchema = createInsertSchema(ratings).omit({
  id: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Rating = typeof ratings.$inferSelect;