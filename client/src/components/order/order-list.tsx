import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { OrderStatus } from "@shared/schema";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useEffect } from "react";
import { queryClient } from "@/lib/queryClient";

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

export default function OrderList() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["/api/orders"],
    refetchInterval: 5000, // Rafraîchir toutes les 5 secondes
    onSuccess: (data) => {
      // Log des données pour débogage
      console.log("Données des commandes reçues:", data);
      if (data && data.length > 0) {
        console.log("Exemple de données de commande:", {
          id: data[0].id,
          status: data[0].status,
          pickupTime: data[0].pickup_time || data[0].pickupTime,
          deliveryTime: data[0].delivery_time || data[0].deliveryTime,
          createdAt: data[0].created_at || data[0].createdAt
        });
      }
    }
  });

  // Formatter la date de création
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    console.log("Formatage de la date:", dateString);
    try {
      const date = new Date(dateString);
      console.log("Date parsée:", date);
      // Vérifier si la date est valide
      if (isNaN(date.getTime())) {
        console.error("Date invalide:", dateString);
        return "N/A";
      }
      return format(date, "dd/MM/yyyy HH:mm", { locale: fr });
    } catch (error) {
      console.error("Erreur lors du formatage de la date:", error);
      return "N/A";
    }
  };

  // Formatter la date de ramassage/livraison
  const formatPickupDeliveryDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    console.log("Formatage de la date de ramassage/livraison:", dateString);
    try {
      const date = new Date(dateString);
      // Vérifier si la date est valide
      if (isNaN(date.getTime())) {
        console.error("Date invalide:", dateString);
        return "N/A";
      }
      return format(date, "PPP", { locale: fr });
    } catch (error) {
      console.error("Erreur lors du formatage de la date:", error);
      return "N/A";
    }
  };

  // Rafraîchir les commandes régulièrement
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Commandes</CardTitle>
          <CardDescription>Chargement des commandes...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Commandes</CardTitle>
        <CardDescription>Gérez vos commandes</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Ramassage</TableHead>
              <TableHead>Livraison</TableHead>
              <TableHead>Prix</TableHead>
              <TableHead>Créée le</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                  Aucune commande trouvée
                </TableCell>
              </TableRow>
            ) : (
              orders?.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>{order.id}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[order.status]}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col space-y-1">
                      <span className="font-medium">{formatPickupDeliveryDate(order.pickup_time || order.pickupTime)}</span>
                      <span className="text-xs text-muted-foreground">{order.pickupAddress}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col space-y-1">
                      <span className="font-medium">{formatPickupDeliveryDate(order.delivery_time || order.deliveryTime)}</span>
                      <span className="text-xs text-muted-foreground">{order.deliveryAddress}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {(order.price / 100).toFixed(2)} DH
                  </TableCell>
                  <TableCell>
                    {formatDate(order.created_at || order.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
