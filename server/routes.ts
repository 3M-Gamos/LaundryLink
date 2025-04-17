import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { pgStorage as storage } from "./pgStorage";
import { insertOrderSchema, insertOrderSchemaServer, InsertOrder, insertRatingSchema } from "@shared/schema";
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

  // Route pour récupérer les utilisateurs par rôle
  app.get("/api/users", ensureAuthenticated, async (req, res) => {
    try {
      // Vérifier que l'utilisateur est un administrateur
      if (req.user.role !== "business") {
        return res.status(403).json({ message: "Seuls les administrateurs peuvent voir les utilisateurs" });
      }
      
      const role = req.query.role as string;
      if (!role) {
        return res.status(400).json({ message: "Le paramètre 'role' est requis" });
      }
      
      const users = await storage.getUsersByRole(role);
      res.json(users);
    } catch (error) {
      console.error("Erreur lors de la récupération des utilisateurs:", error);
      res.status(500).json({ message: "Erreur serveur lors de la récupération des utilisateurs" });
    }
  });

  // Route pour créer des utilisateurs spéciaux (admin/livreur)
  app.post("/api/admin/users", ensureAuthenticated, async (req, res) => {
    try {
      // Vérifier que l'utilisateur est un administrateur
      if (req.user.role !== "business") {
        return res.status(403).json({ message: "Seuls les administrateurs peuvent créer d'autres utilisateurs" });
      }
      
      // Créer l'utilisateur avec le rôle spécifié
      const newUser = await storage.createUser(req.body);
      
      res.status(201).json(newUser);
    } catch (error) {
      console.error("Erreur lors de la création d'un utilisateur par l'admin:", error);
      res.status(500).json({ message: "Erreur serveur lors de la création d'un utilisateur" });
    }
  });

  app.get("/api/customers", ensureAuthenticated, async (req, res) => {
    // Uniquement accessible aux administrateurs (business/admin)
    if (req.user.role !== "business") {
      return res.status(403).json({ message: "Accès restreint aux administrateurs" });
    }
    const customers = await storage.getUsersByRole("customer");
    res.json(customers);
  });

  app.post("/api/orders", ensureAuthenticated, async (req, res) => {
    try {
      console.log("Requête de création de commande reçue:", req.body);
      console.log("Utilisateur connecté:", req.user);
      
      // Validation avec le schéma client (customerId optionnel)
      const clientOrderData = insertOrderSchema.parse(req.body);
      
      // Vérifier que l'utilisateur est un client
      if (req.user.role !== "customer") {
        return res.status(403).json({ message: "Seuls les clients peuvent créer des commandes" });
      }
      
      // Ajouter le customerId à partir de l'utilisateur authentifié
      const orderWithCustomerId = {
        ...clientOrderData,
        customerId: req.user.id,
      };
      
      // Validation avec le schéma serveur (customerId requis)
      const validatedOrderData = insertOrderSchemaServer.parse(orderWithCustomerId);
      
      console.log("Données validées par Zod:", validatedOrderData);
      
      const order = await storage.createOrder(validatedOrderData);
      console.log("Commande créée, réponse:", order);
      
      res.status(201).json(order);
    } catch (error) {
      if (error instanceof ZodError) {
        console.error("Erreur de validation Zod:", error.errors);
        res.status(400).json({ message: JSON.stringify(error.errors, null, 2) });
      } else {
        console.error("Erreur lors de la création de commande:", error);
        res.status(500).json({ message: "Erreur serveur lors de la création de commande" });
      }
    }
  });

  app.get("/api/orders", ensureAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      console.log(`Récupération des commandes pour l'utilisateur ${user.id} avec le rôle ${user.role}`);
      const orders = await storage.getOrdersByUser(user.id, user.role);
      console.log(`${orders.length} commandes trouvées pour l'utilisateur ${user.id}`);
      res.json(orders);
    } catch (error) {
      console.error("Erreur lors de la récupération des commandes:", error);
      res.status(500).json({ message: "Erreur serveur lors de la récupération des commandes" });
    }
  });

  app.patch("/api/orders/:id", ensureAuthenticated, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const user = req.user!;
      
      // Récupérer la commande pour vérifier les permissions
      const order = await storage.getOrder(orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Commande non trouvée" });
      }
      
      // Vérifier que l'utilisateur a le droit de modifier cette commande
      // Les administrateurs (business) peuvent modifier toutes les commandes
      if (user.role !== "business") {
        if (user.role === "customer" && order.customerId !== user.id) {
          return res.status(403).json({ message: "Vous n'avez pas l'autorisation de modifier cette commande" });
        }
        
        if (user.role === "delivery" && order.deliveryId !== user.id) {
          return res.status(403).json({ message: "Vous n'avez pas l'autorisation de modifier cette commande" });
        }
      }
      
      const updatedOrder = await storage.updateOrder(orderId, req.body);
      console.log(`Commande ${orderId} mise à jour par l'utilisateur ${user.id} (${user.role})`);
      res.json(updatedOrder);
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la commande:", error);
      res.status(500).json({ message: "Erreur serveur lors de la mise à jour de la commande" });
    }
  });

  app.post("/api/ratings", ensureAuthenticated, async (req, res) => {
    try {
      const ratingData = insertRatingSchema.parse(req.body);
      
      // Vérifier que l'utilisateur a le droit de noter cette commande
      const order = await storage.getOrder(ratingData.orderId);
      
      if (!order) {
        return res.status(404).json({ message: "Commande non trouvée" });
      }
      
      // Vérifier que l'utilisateur évaluant est bien lié à la commande
      if (req.user!.id !== order.customerId && req.user!.id !== order.businessId && req.user!.id !== order.deliveryId) {
        return res.status(403).json({ message: "Vous n'avez pas l'autorisation de noter cette commande" });
      }
      
      // Vérifier que fromUserId correspond à l'utilisateur connecté
      const updatedRatingData = {
        ...ratingData,
        fromUserId: req.user!.id
      };
      
      const rating = await storage.createRating(updatedRatingData);
      res.status(201).json(rating);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: error.message });
      } else {
        console.error("Erreur lors de la création de l'évaluation:", error);
        res.status(500).json({ message: "Erreur serveur lors de la création de l'évaluation" });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}