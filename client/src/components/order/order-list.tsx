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
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
          <CardDescription>Loading orders...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Orders</CardTitle>
        <CardDescription>Manage your orders</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Pickup</TableHead>
              <TableHead>Delivery</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders?.map((order) => (
              <TableRow key={order.id}>
                <TableCell>{order.id}</TableCell>
                <TableCell>
                  <Badge className={statusColors[order.status]}>
                    {order.status}
                  </Badge>
                </TableCell>
                <TableCell>{order.pickupAddress}</TableCell>
                <TableCell>{order.deliveryAddress}</TableCell>
                <TableCell>${(order.price / 100).toFixed(2)}</TableCell>
                <TableCell>
                  {format(new Date(order.createdAt), "PP")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
