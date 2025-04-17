import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const UserRole = {
  CUSTOMER: "customer",
  DELIVERY: "delivery",
  BUSINESS: "business", // Gardé comme "business" pour la BD
} as const;

export const OrderStatus = {
  PENDING: "En attente",
  ACCEPTED: "Acceptée",
  PICKED_UP: "Ramassée",
  IN_PROGRESS: "En traitement",
  READY: "Prête",
  DELIVERING: "En livraison",
  DELIVERED: "Livrée",
  CANCELLED: "Annulée",
} as const;

export const LaundryItem = {
  SHIRT: "Chemise",
  PANTS: "Pantalon",
  DRESS: "Robe",
  SUIT: "Costume",
  COAT: "Manteau",
  BEDDING: "Literie",
  CURTAINS: "Rideaux",
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

// Créer un schéma de base pour les commandes
const baseOrderSchema = createInsertSchema(orders, {
  items: z.array(orderItemSchema),
  pickupTime: z.string().or(z.date()),
  deliveryTime: z.string().or(z.date()),
});

// Schéma côté client - customerId est optionnel car il sera définit par le serveur
export const insertOrderSchema = baseOrderSchema
  .omit({
    id: true,
    deliveryId: true,
    createdAt: true,
  })
  .partial({ customerId: true });

// Schéma côté serveur - customerId reste requis
export const insertOrderSchemaServer = baseOrderSchema
  .omit({
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
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type User = typeof users.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Rating = typeof ratings.$inferSelect;