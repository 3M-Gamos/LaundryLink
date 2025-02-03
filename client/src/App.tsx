import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import CustomerDashboard from "@/pages/customer/dashboard";
import DeliveryDashboard from "@/pages/delivery/dashboard";
import BusinessDashboard from "@/pages/business/dashboard";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import { UserRole } from "@shared/schema";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute 
        path="/" 
        component={({ user }) => {
          switch (user.role) {
            case UserRole.CUSTOMER:
              return <CustomerDashboard />;
            case UserRole.DELIVERY:
              return <DeliveryDashboard />;
            case UserRole.BUSINESS:
              return <BusinessDashboard />;
            default:
              return <NotFound />;
          }
        }}
      />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
