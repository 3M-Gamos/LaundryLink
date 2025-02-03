import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertOrderSchema, insertRatingSchema } from "@shared/schema";
import { ZodError } from "zod";

function ensureAuthenticated(req: Express.Request, res: Express.Response, next: Express.NextFunction) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Unauthorized" });
}

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  app.get("/api/businesses", ensureAuthenticated, async (req, res) => {
    const businesses = await storage.getUsersByRole("business");
    res.json(businesses);
  });

  app.post("/api/orders", ensureAuthenticated, async (req, res) => {
    try {
      const orderData = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(orderData);
      res.status(201).json(order);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: error.message });
      } else {
        throw error;
      }
    }
  });

  app.get("/api/orders", ensureAuthenticated, async (req, res) => {
    const user = req.user!;
    const orders = await storage.getOrdersByUser(user.id, user.role);
    res.json(orders);
  });

  app.patch("/api/orders/:id", ensureAuthenticated, async (req, res) => {
    const order = await storage.updateOrder(parseInt(req.params.id), req.body);
    res.json(order);
  });

  app.post("/api/ratings", ensureAuthenticated, async (req, res) => {
    try {
      const ratingData = insertRatingSchema.parse(req.body);
      const rating = await storage.createRating(ratingData);
      res.status(201).json(rating);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: error.message });
      } else {
        throw error;
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
