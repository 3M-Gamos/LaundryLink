import DashboardLayout from "@/components/layouts/dashboard-layout";
import OrderList from "@/components/order/order-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

export default function BusinessDashboard() {
  const { data: orders } = useQuery({
    queryKey: ["/api/orders"],
  });

  const pendingOrders = orders?.filter((o) => o.status === "pending") ?? [];
  const activeOrders = orders?.filter((o) => 
    ["accepted", "in_progress", "ready"].includes(o.status)
  ) ?? [];
  
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Pending Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {pendingOrders.length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Active Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {activeOrders.length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Today's Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                ${orders?.reduce((acc, o) => acc + o.price, 0) / 100 ?? 0}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <OrderList />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
