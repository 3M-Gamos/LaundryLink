import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Package,
  Truck,
  Store,
  LogOut,
  User,
  BarChart,
  Settings,
} from "lucide-react";
import { UserRole } from "@shared/schema";

const roleIcons = {
  [UserRole.CUSTOMER]: Package,
  [UserRole.DELIVERY]: Truck,
  [UserRole.BUSINESS]: Store,
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logoutMutation } = useAuth();
  const RoleIcon = roleIcons[user?.role ?? UserRole.CUSTOMER];

  return (
    <div className="min-h-screen flex">
      <div className="w-64 bg-sidebar border-r border-sidebar-border">
        <div className="p-4 h-full flex flex-col">
          <div className="flex items-center gap-3 px-2 py-4">
            <RoleIcon className="h-6 w-6 text-sidebar-primary" />
            <span className="font-semibold text-sidebar-primary">
              LaundryConnect
            </span>
          </div>

          <nav className="flex-1 mt-8">
            <div className="space-y-1">
              <Button
                variant="ghost"
                className="w-full justify-start"
                asChild
              >
                <Link href="/">
                  <BarChart className="mr-2 h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start"
                asChild
              >
                <Link href="/orders">
                  <Package className="mr-2 h-4 w-4" />
                  Orders
                </Link>
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start"
                asChild
              >
                <Link href="/profile">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start"
                asChild
              >
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </Button>
            </div>
          </nav>

          <div className="border-t border-sidebar-border pt-4">
            <Button
              variant="ghost"
              className="w-full justify-start text-destructive"
              onClick={() => logoutMutation.mutate()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}