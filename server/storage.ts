import { IStorage } from "./storage";
import { User, Order, Rating, InsertUser, InsertOrder, InsertRating } from "@shared/schema";
import createMemoryStore from "memorystore";
import session from "express-session";

const MemoryStore = createMemoryStore(session);

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private orders: Map<number, Order>;
  private ratings: Map<number, Rating>;
  sessionStore: session.Store;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.orders = new Map();
    this.ratings = new Map();
    this.currentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user = { ...insertUser, id, rating: 5 };
    this.users.set(id, user);
    return user;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const id = this.currentId++;
    const newOrder = {
      ...order,
      id,
      deliveryId: null,
      createdAt: new Date(),
    };
    this.orders.set(id, newOrder);
    return newOrder;
  }

  async updateOrder(id: number, update: Partial<Order>): Promise<Order> {
    const order = this.orders.get(id);
    if (!order) throw new Error("Order not found");
    const updatedOrder = { ...order, ...update };
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }

  async getOrder(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async getOrdersByUser(userId: number, role: "customer" | "business" | "delivery"): Promise<Order[]> {
    return Array.from(this.orders.values()).filter((order) => {
      if (role === "customer") return order.customerId === userId;
      if (role === "business") return order.businessId === userId;
      return order.deliveryId === userId;
    });
  }

  async createRating(rating: InsertRating): Promise<Rating> {
    const id = this.currentId++;
    const newRating = { ...rating, id };
    this.ratings.set(id, newRating);
    return newRating;
  }

  async getRatingsByUser(userId: number): Promise<Rating[]> {
    return Array.from(this.ratings.values()).filter(
      (rating) => rating.toUserId === userId,
    );
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return Array.from(this.users.values()).filter((user) => user.role === role);
  }
}

export const storage = new MemStorage();
