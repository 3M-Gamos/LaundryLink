import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
const { Pool } = pg;
import dotenv from "dotenv";
import { users, orders, ratings } from "@shared/schema";

// Load environment variables
dotenv.config();

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create Drizzle ORM instance
export const db = drizzle(pool);

// Initialize database schema if needed
export async function initDB() {
  try {
    // Check if users table exists
    const userTableExists = await pool.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')"
    );
    
    if (!userTableExists.rows[0].exists) {
      console.log("Creating database tables...");
      
      // Create users table
      await pool.query(`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          role TEXT NOT NULL,
          name TEXT NOT NULL,
          phone TEXT NOT NULL,
          address TEXT,
          rating INTEGER
        )
      `);
      
      // Create orders table
      await pool.query(`
        CREATE TABLE orders (
          id SERIAL PRIMARY KEY,
          customer_id INTEGER NOT NULL,
          business_id INTEGER NOT NULL,
          delivery_id INTEGER,
          status TEXT NOT NULL,
          items JSONB NOT NULL,
          pickup_address TEXT NOT NULL,
          delivery_address TEXT NOT NULL,
          pickup_time TIMESTAMP NOT NULL,
          delivery_time TIMESTAMP NOT NULL,
          price INTEGER NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      
      // Create ratings table
      await pool.query(`
        CREATE TABLE ratings (
          id SERIAL PRIMARY KEY,
          order_id INTEGER NOT NULL,
          from_user_id INTEGER NOT NULL,
          to_user_id INTEGER NOT NULL,
          rating INTEGER NOT NULL,
          comment TEXT
        )
      `);
      
      // Insert sample business data
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
        },
        {
          username: "pressing_tanger",
          password: "password123",
          role: "business",
          name: "Pressing Modern Tanger",
          phone: "+212 539 456789",
          address: "15 Boulevard Pasteur, Tanger",
          rating: 5,
        },
        {
          username: "pressing_fes",
          password: "password123",
          role: "business",
          name: "Pressing Traditionnel Fes",
          phone: "+212 535 567890",
          address: "32 Rue Talaa Kebira, Fes",
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
      
      console.log("Database setup complete!");
    } else {
      console.log("Database already initialized.");
    }
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
}
