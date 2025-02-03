import DashboardLayout from "@/components/layouts/dashboard-layout";
import OrderForm from "@/components/order/order-form";
import OrderList from "@/components/order/order-list";
import OrderMap from "@/components/order/order-map";

export default function CustomerDashboard() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <OrderForm />
          <OrderMap />
        </div>
        <OrderList />
      </div>
    </DashboardLayout>
  );
}
