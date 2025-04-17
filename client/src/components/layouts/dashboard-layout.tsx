import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Package,
  Truck,
  Store,
  LogOut,
  BarChart,
  Menu,
  X
} from "lucide-react";
import { useState } from "react";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-sidebar border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <RoleIcon className="h-6 w-6 text-sidebar-primary" />
          <span className="font-semibold text-sidebar-primary">
            LaundryConnect
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>
      
      {/* Sidebar - hidden on mobile unless menu is open */}
      <div className={`${mobileMenuOpen ? 'block' : 'hidden'} md:block w-full md:w-64 bg-sidebar border-r border-sidebar-border`}>
        <div className="p-4 h-full flex flex-col">
          <div className="hidden md:flex items-center gap-3 px-2 py-4">
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
                  Commandes
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
              Déconnexion
            </Button>
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}