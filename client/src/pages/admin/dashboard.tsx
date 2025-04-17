import DashboardLayout from "@/components/layouts/dashboard-layout";
import OrderStatusManager from "@/components/order/order-status-manager";
import UserManagement from "@/components/admin/user-management";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminDashboard() {
  const { data: orders } = useQuery({
    queryKey: ["/api/orders"],
  });

  const pendingOrders = orders?.filter((o) => o.status === "pending") ?? [];
  const activeOrders = orders?.filter((o) => 
    ["accepted", "in_progress", "ready"].includes(o.status)
  ) ?? [];
  const completedOrders = orders?.filter((o) => 
    ["delivered"].includes(o.status)
  ) ?? [];
  
  // Calculer le revenu du jour
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayRevenue = orders
    ?.filter(o => {
      const orderDate = new Date(o.createdAt);
      return orderDate >= today;
    })
    .reduce((acc, o) => acc + o.price, 0) / 100 ?? 0;
  
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Commandes en attente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pendingOrders.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Commandes qui nécessitent une action
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Commandes actives
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {activeOrders.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Commandes en cours de traitement
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Commandes complétées
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {completedOrders.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Commandes livrées avec succès
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Revenu du jour
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {todayRevenue.toFixed(2)} DH
              </div>
              <p className="text-xs text-muted-foreground">
                Total des commandes du jour
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="orders">
          <TabsList>
            <TabsTrigger value="orders">Gestion des commandes</TabsTrigger>
            <TabsTrigger value="users">Gestion des utilisateurs</TabsTrigger>
          </TabsList>
          <TabsContent value="orders" className="mt-6">
            <OrderStatusManager />
          </TabsContent>
          <TabsContent value="users" className="mt-6">
            <UserManagement />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
