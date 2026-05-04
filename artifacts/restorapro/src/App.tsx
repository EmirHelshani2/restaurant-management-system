import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, getHomePathForRole, useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/layout";
import NotFound from "@/pages/not-found";

// Pages
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Tables from "@/pages/tables";
import Kitchen from "@/pages/kitchen";
import Bar from "@/pages/bar";
import Waiter from "@/pages/waiter";
import Cashier from "@/pages/cashier";
import Reservations from "@/pages/reservations";
import Menu from "@/pages/menu";
import Inventory from "@/pages/inventory";
import Staff from "@/pages/staff";
import Customers from "@/pages/customers";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import Receipt from "@/pages/receipt";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, roles, withLayout = true, ...rest }: any) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!user) return <Redirect to="/login" />;
  if (roles && !roles.includes(user.role)) return <Redirect to={getHomePathForRole(user.role)} />;

  if (!withLayout) {
    return <Component {...rest} />;
  }

  return (
    <AppLayout>
      <Component {...rest} />
    </AppLayout>
  );
}

function AppContent() {
  const { user } = useAuth();

  return (
    <Switch>
      <Route path="/login">
        {user ? <Redirect to={getHomePathForRole(user.role)} /> : <Login />}
      </Route>

      <Route path="/receipt/:id">
        <ProtectedRoute component={Receipt} roles={["admin", "manager", "cashier"]} withLayout={false} />
      </Route>
      
      {/* Protected Routes */}
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} roles={["admin", "manager"]} />
      </Route>

      <Route path="/tables">
        <ProtectedRoute component={Tables} roles={["admin", "manager", "waiter", "receptionist"]} />
      </Route>

      <Route path="/reservations">
        <ProtectedRoute component={Reservations} roles={["admin", "manager", "receptionist"]} />
      </Route>

      <Route path="/kitchen">
        <ProtectedRoute component={Kitchen} roles={["admin", "kitchen"]} />
      </Route>
      
      <Route path="/bar">
        <ProtectedRoute component={Bar} roles={["admin", "bar"]} />
      </Route>

      <Route path="/waiter">
        <ProtectedRoute component={Waiter} roles={["admin", "waiter"]} />
      </Route>

      <Route path="/cashier">
        <ProtectedRoute component={Cashier} roles={["admin", "manager", "cashier"]} />
      </Route>

      <Route path="/menu">
        <ProtectedRoute component={Menu} roles={["admin", "manager"]} />
      </Route>

      <Route path="/inventory">
        <ProtectedRoute component={Inventory} roles={["admin", "manager", "inventory_manager"]} />
      </Route>

      <Route path="/staff">
        <ProtectedRoute component={Staff} roles={["admin", "manager"]} />
      </Route>

      <Route path="/customers">
        <ProtectedRoute component={Customers} roles={["admin", "manager", "receptionist"]} />
      </Route>

      <Route path="/reports">
        <ProtectedRoute component={Reports} roles={["admin", "manager", "inventory_manager"]} />
      </Route>

      <Route path="/settings">
        <ProtectedRoute component={Settings} roles={["admin", "manager"]} />
      </Route>

      {/* Default route */}
      <Route path="/">
        {user ? <Redirect to={getHomePathForRole(user.role)} /> : <Redirect to="/login" />}
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppContent />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
