import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { OrderStatus } from "@shared/schema";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, Clock, Check, X, RotateCcw, FileText } from "lucide-react";
import OrderDetails from "./order-details";

// Définition des couleurs pour chaque statut
const statusColors: Record<string, string> = {
  [OrderStatus.PENDING]: "bg-yellow-500",
  [OrderStatus.ACCEPTED]: "bg-blue-500",
  [OrderStatus.PICKED_UP]: "bg-purple-500",
  [OrderStatus.IN_PROGRESS]: "bg-orange-500",
  [OrderStatus.READY]: "bg-green-500",
  [OrderStatus.DELIVERING]: "bg-blue-600",
  [OrderStatus.DELIVERED]: "bg-green-600",
  [OrderStatus.CANCELLED]: "bg-red-500",
};

// Définition des transitions de statut autorisées
const allowedStatusTransitions: Record<string, string[]> = {
  [OrderStatus.PENDING]: [OrderStatus.ACCEPTED, OrderStatus.CANCELLED],
  [OrderStatus.ACCEPTED]: [OrderStatus.PICKED_UP, OrderStatus.CANCELLED],
  [OrderStatus.PICKED_UP]: [OrderStatus.IN_PROGRESS],
  [OrderStatus.IN_PROGRESS]: [OrderStatus.READY],
  [OrderStatus.READY]: [OrderStatus.DELIVERING],
  [OrderStatus.DELIVERING]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

// Description des étapes pour l'utilisateur
const statusDescriptions: Record<string, string> = {
  [OrderStatus.PENDING]: "La commande est en attente de confirmation",
  [OrderStatus.ACCEPTED]: "Commande acceptée, en attente de ramassage",
  [OrderStatus.PICKED_UP]: "Les vêtements ont été récupérés",
  [OrderStatus.IN_PROGRESS]: "Vêtements en cours de nettoyage",
  [OrderStatus.READY]: "Vêtements nettoyés, prêts pour la livraison",
  [OrderStatus.DELIVERING]: "Vêtements en cours de livraison",
  [OrderStatus.DELIVERED]: "Vêtements livrés au client",
  [OrderStatus.CANCELLED]: "Commande annulée",
};

// Regrouper les statuts par catégorie
const statusCategories = {
  pending: [OrderStatus.PENDING],
  active: [OrderStatus.ACCEPTED, OrderStatus.PICKED_UP, OrderStatus.IN_PROGRESS, OrderStatus.READY],
  delivering: [OrderStatus.DELIVERING],
  completed: [OrderStatus.DELIVERED],
  cancelled: [OrderStatus.CANCELLED],
};

export default function OrderStatusManager() {
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [comment, setComment] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [customers, setCustomers] = useState<Record<number, string>>({});

  // Récupérer la liste des commandes
  const { data: orders, isLoading } = useQuery({
    queryKey: ["/api/orders"],
    refetchInterval: 5000, // Rafraîchir toutes les 5 secondes
  });

  // Récupérer la liste des utilisateurs (clients)
  const { data: users } = useQuery({
    queryKey: ["/api/customers"],
    enabled: !!orders,
    // Cette requête n'existe pas encore - nous la créerons plus tard
  });

  // Préparer un mapping des ID clients vers leurs noms
  useEffect(() => {
    if (users) {
      const userMap: Record<number, string> = {};
      users.forEach((user: any) => {
        userMap[user.id] = user.name;
      });
      setCustomers(userMap);
    }
  }, [users]);

  // Rafraîchir les commandes régulièrement
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Filtrer les commandes en fonction de l'onglet actif
  const filteredOrders = orders?.filter(order => {
    if (activeTab === "all") return true;
    if (activeTab === "pending") return statusCategories.pending.includes(order.status);
    if (activeTab === "active") return statusCategories.active.includes(order.status);
    if (activeTab === "delivering") return statusCategories.delivering.includes(order.status);
    if (activeTab === "completed") return statusCategories.completed.includes(order.status);
    if (activeTab === "cancelled") return statusCategories.cancelled.includes(order.status);
    return true;
  });

  // Compter les commandes par catégorie
  const countByCategory = {
    all: orders?.length || 0,
    pending: orders?.filter(o => statusCategories.pending.includes(o.status)).length || 0,
    active: orders?.filter(o => statusCategories.active.includes(o.status)).length || 0,
    delivering: orders?.filter(o => statusCategories.delivering.includes(o.status)).length || 0,
    completed: orders?.filter(o => statusCategories.completed.includes(o.status)).length || 0,
    cancelled: orders?.filter(o => statusCategories.cancelled.includes(o.status)).length || 0,
  };

  // Mutation pour mettre à jour le statut d'une commande
  const updateOrderStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      const response = await apiRequest("PATCH", `/api/orders/${orderId}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({
        title: "Statut mis à jour",
        description: "Le statut de la commande a été mis à jour avec succès",
      });
      setDialogOpen(false);
      setComment("");
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: `Erreur lors de la mise à jour du statut: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Ouvrir la boîte de dialogue pour modifier le statut
  const openStatusDialog = (order: any) => {
    setSelectedOrder(order);
    setSelectedStatus("");
    setDialogOpen(true);
  };

  // Ouvrir la boîte de dialogue des détails
  const openDetailsDialog = (order: any) => {
    setSelectedOrder(order);
    setDetailsDialogOpen(true);
  };

  // Obtenir les statuts disponibles pour une commande en fonction de son statut actuel
  const getAvailableStatuses = (currentStatus: string) => {
    return allowedStatusTransitions[currentStatus] || [];
  };

  // Action rapide pour mettre à jour directement le statut sans ouvrir la boîte de dialogue
  const handleQuickUpdate = (order: any, newStatus: string) => {
    updateOrderStatus.mutate({
      orderId: order.id,
      status: newStatus,
    });
  };

  // Mettre à jour le statut de la commande
  const handleStatusUpdate = () => {
    if (!selectedOrder || !selectedStatus) return;
    
    updateOrderStatus.mutate({
      orderId: selectedOrder.id,
      status: selectedStatus,
    });
  };

  // Obtenir le nom du client à partir de son ID
  const getCustomerName = (customerId: number) => {
    return customers[customerId] || `Client #${customerId}`;
  };

  // Formatter la date de création
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm");
    } catch (error) {
      return "Date inconnue";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gestion des commandes</CardTitle>
          <CardDescription>Chargement des commandes...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Gestion des commandes</CardTitle>
          <CardDescription>Suivez et mettez à jour le statut des commandes</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="all" className="relative">
                Toutes
                <Badge className="ml-1 bg-gray-500">{countByCategory.all}</Badge>
              </TabsTrigger>
              <TabsTrigger value="pending" className="relative">
                En attente
                <Badge className="ml-1 bg-yellow-500">{countByCategory.pending}</Badge>
              </TabsTrigger>
              <TabsTrigger value="active" className="relative">
                Actives
                <Badge className="ml-1 bg-blue-500">{countByCategory.active}</Badge>
              </TabsTrigger>
              <TabsTrigger value="delivering" className="relative">
                En livraison
                <Badge className="ml-1 bg-blue-600">{countByCategory.delivering}</Badge>
              </TabsTrigger>
              <TabsTrigger value="completed" className="relative">
                Terminées
                <Badge className="ml-1 bg-green-600">{countByCategory.completed}</Badge>
              </TabsTrigger>
              <TabsTrigger value="cancelled" className="relative">
                Annulées
                <Badge className="ml-1 bg-red-500">{countByCategory.cancelled}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Adresse de ramassage</TableHead>
                    <TableHead>Prix</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                        Aucune commande trouvée dans cette catégorie
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders?.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>{order.id}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[order.status]}>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{getCustomerName(order.customerId)}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {order.pickupAddress}
                        </TableCell>
                        <TableCell>${(order.price / 100).toFixed(2)} DH</TableCell>
                        <TableCell>
                          {formatDate(order.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {/* Bouton détails pour tous les statuts */}
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={() => openDetailsDialog(order)}
                              title="Voir les détails"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                            
                            {/* Actions rapides en fonction du statut */}
                            {order.status === OrderStatus.PENDING && (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="icon"
                                  onClick={() => handleQuickUpdate(order, OrderStatus.ACCEPTED)}
                                  title="Accepter la commande"
                                >
                                  <Check className="h-4 w-4 text-green-500" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="icon"
                                  onClick={() => handleQuickUpdate(order, OrderStatus.CANCELLED)}
                                  title="Refuser la commande"
                                >
                                  <X className="h-4 w-4 text-red-500" />
                                </Button>
                              </>
                            )}
                            
                            {/* Bouton modification pour tous les statuts qui peuvent être modifiés */}
                            {getAvailableStatuses(order.status).length > 0 && (
                              <Button 
                                variant="outline" 
                                size="icon"
                                onClick={() => openStatusDialog(order)}
                                title="Modifier le statut"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Boîte de dialogue pour la mise à jour du statut */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Mise à jour du statut de la commande</DialogTitle>
            <DialogDescription>
              Commande #{selectedOrder?.id}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Détails de la commande */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Client</p>
                <p className="text-sm">{selectedOrder && getCustomerName(selectedOrder.customerId)}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Date de création</p>
                <p className="text-sm">{selectedOrder && formatDate(selectedOrder.createdAt)}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Adresse de ramassage</p>
                <p className="text-sm">{selectedOrder?.pickupAddress}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Adresse de livraison</p>
                <p className="text-sm">{selectedOrder?.deliveryAddress}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Prix</p>
                <p className="text-sm">${selectedOrder && (selectedOrder.price / 100).toFixed(2)} DH</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Articles</p>
                <p className="text-sm">
                  {selectedOrder?.items && selectedOrder.items.length} article(s)
                </p>
              </div>
            </div>

            <div className="border-t pt-4 mt-2">
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="text-sm font-medium col-span-1">
                  Statut actuel:
                </span>
                <div className="col-span-3">
                  {selectedOrder && (
                    <Badge className={statusColors[selectedOrder.status]}>
                      {selectedOrder.status}
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4 mt-4">
                <span className="text-sm font-medium col-span-1">
                  Nouveau statut:
                </span>
                <div className="col-span-3">
                  <Select 
                    value={selectedStatus} 
                    onValueChange={setSelectedStatus}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un nouveau statut" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedOrder && 
                        getAvailableStatuses(selectedOrder.status).map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4 mt-4">
                <span className="text-sm font-medium col-span-1">
                  Description:
                </span>
                <div className="col-span-3">
                  {selectedStatus ? (
                    <p className="text-sm text-muted-foreground">
                      {statusDescriptions[selectedStatus]}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      Sélectionnez un statut pour voir sa description
                    </p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-start gap-4 mt-4">
                <span className="text-sm font-medium col-span-1">
                  Commentaire:
                </span>
                <div className="col-span-3">
                  <Textarea
                    placeholder="Commentaire optionnel (visible en interne uniquement)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="resize-none"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleStatusUpdate}
              disabled={!selectedStatus || updateOrderStatus.isPending}
            >
              {updateOrderStatus.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Mettre à jour
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Boîte de dialogue pour afficher les détails de la commande */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Détails de la commande</DialogTitle>
            <DialogDescription>
              Commande #{selectedOrder?.id}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {selectedOrder && <OrderDetails order={selectedOrder} />}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              Fermer
            </Button>
            {getAvailableStatuses(selectedOrder?.status || "").length > 0 && (
              <Button 
                onClick={() => {
                  setDetailsDialogOpen(false);
                  openStatusDialog(selectedOrder);
                }}
              >
                Modifier le statut
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
