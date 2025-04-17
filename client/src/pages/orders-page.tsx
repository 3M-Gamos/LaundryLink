import DashboardLayout from "@/components/layouts/dashboard-layout";
import OrderList from "@/components/order/order-list";

export default function OrdersPage() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <h1 className="text-2xl font-bold">Mes commandes</h1>
        <p className="text-muted-foreground">
          Consultez et suivez l'état de toutes vos commandes
        </p>
        <OrderList />
      </div>
    </DashboardLayout>
  );
}
