import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { OrderStatus, LaundryItem } from "@shared/schema";
import { format } from "date-fns";

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

interface OrderDetailsProps {
  order: any;
}

export default function OrderDetails({ order }: OrderDetailsProps) {
  if (!order) return null;

  // Formatter la date de création
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm");
    } catch (error) {
      return "Date inconnue";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Commande #{order.id}</CardTitle>
            <CardDescription>
              Créée le {formatDate(order.createdAt)}
            </CardDescription>
          </div>
          <Badge className={statusColors[order.status]}>
            {order.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Informations sur le client et adresses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Client</h3>
              <p className="text-sm">Client #{order.customerId}</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Prix total</h3>
              <p className="text-lg font-semibold">${(order.price / 100).toFixed(2)}</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Adresse de ramassage</h3>
              <p className="text-sm">{order.pickupAddress}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(order.pickupTime)}
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Adresse de livraison</h3>
              <p className="text-sm">{order.deliveryAddress}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(order.deliveryTime)}
              </p>
            </div>
          </div>

          <Separator />

          {/* Liste des articles */}
          <div>
            <h3 className="text-sm font-medium mb-4">Articles commandés</h3>
            <div className="space-y-4">
              {order.items && order.items.length > 0 ? (
                <div className="rounded-md border">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Article
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantité
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Prix unitaire
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {order.items.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {LaundryItem[item.item as keyof typeof LaundryItem] || item.item}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {item.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            ${(item.price / 100).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            ${((item.price * item.quantity) / 100).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={3} className="px-6 py-4 text-sm font-medium text-right">
                          Total
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          ${(order.price / 100).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <p className="text-center text-muted-foreground">Aucun article dans cette commande</p>
              )}
            </div>
          </div>

          {/* Historique des statuts (à implémenter dans une future version) */}
          <Separator />
          <div>
            <h3 className="text-sm font-medium mb-2">Historique des statuts</h3>
            <p className="text-xs text-muted-foreground italic">
              L'historique détaillé des statuts sera disponible dans une prochaine version.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
