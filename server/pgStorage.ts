import { IStorage } from "./storage";
import { User, Order, Rating, InsertUser, InsertOrder, InsertRating } from "@shared/schema";
import { db, initDB } from "./db";
import { eq, and } from "drizzle-orm";
import { users, orders, ratings } from "@shared/schema";
import createPgStore from "connect-pg-simple";
import session from "express-session";
import pg from "pg";
const { Pool } = pg;

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export class PgStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    const pgSessionStore = createPgStore(session);
    this.sessionStore = new pgSessionStore({
      pool: new Pool({
        connectionString: process.env.DATABASE_URL,
      }),
      tableName: "session",
      createTableIfMissing: true,
    });
    
    // Initialize the database
    initDB().catch(console.error);
    
    // Insert sample businesses if they don't exist
    this.ensureSampleBusinesses();
  }
  
  private async ensureSampleBusinesses() {
    try {
      // Check if any businesses exist
      const result = await pool.query(
        "SELECT * FROM users WHERE role = 'business' LIMIT 1"
      );
      
      if (result.rows.length === 0) {
        console.log("Inserting sample businesses...");
        
        // Sample business data
        const sampleBusinesses = [
          {
            username: "pressing_casablanca",
            password: "password123",
            role: "business",
            name: "Pressing Royal Casablanca",
            phone: "+212 522 123456",
            address: "123 Boulevard Mohammed V, Casablanca",
            rating: 5,
          },
          {
            username: "pressing_rabat",
            password: "password123",
            role: "business",
            name: "Pressing Express Rabat",
            phone: "+212 537 234567",
            address: "45 Avenue Hassan II, Rabat",
            rating: 5,
          },
          {
            username: "pressing_marrakech",
            password: "password123",
            role: "business",
            name: "Pressing Medina Marrakech",
            phone: "+212 524 345678",
            address: "78 Rue de la Kasbah, Marrakech",
            rating: 5,
          }
        ];
        
        for (const business of sampleBusinesses) {
          await pool.query(
            `INSERT INTO users (username, password, role, name, phone, address, rating) 
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              business.username,
              business.password,
              business.role,
              business.name,
              business.phone,
              business.address,
              business.rating
            ]
          );
        }
        
        console.log("Sample businesses inserted!");
      }
    } catch (error) {
      console.error("Error ensuring sample businesses:", error);
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    return result.rows[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    return result.rows[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await pool.query(
      `INSERT INTO users (username, password, role, name, phone, address, rating) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        insertUser.username,
        insertUser.password,
        insertUser.role,
        insertUser.name,
        insertUser.phone,
        insertUser.address || null,
        5
      ]
    );
    return result.rows[0];
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    console.log("Tentative de création de commande:", order);
    try {
      const result = await pool.query(
        `INSERT INTO orders (customer_id, business_id, delivery_id, status, items, pickup_address, 
          delivery_address, pickup_time, delivery_time, price, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
        [
          order.customerId,
          order.businessId,
          null,
          order.status,
          JSON.stringify(order.items),
          order.pickupAddress,
          order.deliveryAddress,
          order.pickupTime,
          order.deliveryTime,
          order.price,
          new Date()
        ]
      );
      console.log("Commande créée avec succès:", result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error("Erreur lors de la création de la commande:", error);
      throw error;
    }
  }

  async updateOrder(id: number, update: Partial<Order>): Promise<Order> {
    const updateFields = [];
    const values = [];
    let counter = 1;
    
    // Dynamically build the SET clause
    for (const [key, value] of Object.entries(update)) {
      if (value !== undefined) {
        // Convert camelCase to snake_case for PostgreSQL
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        updateFields.push(`${snakeKey} = $${counter}`);
        values.push(key === 'items' ? JSON.stringify(value) : value);
        counter++;
      }
    }
    
    if (updateFields.length === 0) {
      throw new Error("No fields to update");
    }
    
    values.push(id); // Add id as the last parameter
    
    const result = await pool.query(
      `UPDATE orders SET ${updateFields.join(', ')} WHERE id = $${counter} RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      throw new Error("Order not found");
    }
    
    return result.rows[0];
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const result = await pool.query("SELECT * FROM orders WHERE id = $1", [id]);
    return result.rows[0];
  }

  async getAllOrders(): Promise<Order[]> {
    const result = await pool.query("SELECT * FROM orders ORDER BY created_at DESC");
    return result.rows;
  }

  async getOrdersByUser(userId: number, role: "customer" | "business" | "delivery"): Promise<Order[]> {
    // Si l'utilisateur est un business (admin), renvoyer toutes les commandes
    if (role === "business") {
      console.log("Récupération de toutes les commandes pour l'administrateur");
      return this.getAllOrders();
    }
    
    // Sinon, filtrer par userId selon le rôle
    let columnName: string;
    
    if (role === "customer") {
      columnName = "customer_id";
    } else { // delivery
      columnName = "delivery_id";
    }
    
    const result = await pool.query(`SELECT * FROM orders WHERE ${columnName} = $1 ORDER BY created_at DESC`, [userId]);
    return result.rows;
  }

  async getOrdersByBusinessId(businessId: number): Promise<Order[]> {
    const result = await pool.query("SELECT * FROM orders WHERE business_id = $1 ORDER BY created_at DESC", [businessId]);
    return result.rows;
  }

  async createRating(rating: InsertRating): Promise<Rating> {
    const result = await pool.query(
      `INSERT INTO ratings (order_id, from_user_id, to_user_id, rating, comment) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        rating.orderId,
        rating.fromUserId,
        rating.toUserId,
        rating.rating,
        rating.comment || null
      ]
    );
    return result.rows[0];
  }

  async getRatingsByUser(userId: number): Promise<Rating[]> {
    const result = await pool.query("SELECT * FROM ratings WHERE to_user_id = $1", [userId]);
    return result.rows;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    console.log("Getting users by role:", role);
    const result = await pool.query("SELECT * FROM users WHERE role = $1", [role]);
    console.log("Found users:", result.rows);
    return result.rows;
  }
}

export const pgStorage = new PgStorage();