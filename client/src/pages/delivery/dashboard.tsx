import DashboardLayout from "@/components/layouts/dashboard-layout";
import OrderList from "@/components/order/order-list";
import OrderMap from "@/components/order/order-map";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

export default function DeliveryDashboard() {
  const { data: orders } = useQuery({
    queryKey: ["/api/orders"],
  });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Active Deliveries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {orders?.filter((o) => o.status === "delivering").length ?? 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Completed Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {orders?.filter((o) => o.status === "delivered").length ?? 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Average Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">4.8</div>
            </CardContent>
          </Card>
        </div>

        <OrderMap orders={orders} />
        <OrderList />
      </div>
    </DashboardLayout>
  );
}
