import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useLogout } from "@workspace/api-client-react";
import {
  LayoutDashboard,
  Grid,
  Calendar,
  Utensils,
  ChefHat,
  Wine,
  Banknote,
  BookOpen,
  Package,
  Users,
  Users2,
  BarChart3,
  Settings,
  LogOut,
  Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "manager"] },
  { label: "Tables", href: "/tables", icon: Grid, roles: ["admin", "manager", "waiter", "receptionist"] },
  { label: "Reservations", href: "/reservations", icon: Calendar, roles: ["admin", "manager", "receptionist"] },
  { label: "Waiter", href: "/waiter", icon: Utensils, roles: ["admin", "waiter"] },
  { label: "Kitchen", href: "/kitchen", icon: ChefHat, roles: ["admin", "kitchen"] },
  { label: "Bar", href: "/bar", icon: Wine, roles: ["admin", "bar"] },
  { label: "Cashier", href: "/cashier", icon: Banknote, roles: ["admin", "manager", "cashier"] },
  { label: "Menu", href: "/menu", icon: BookOpen, roles: ["admin", "manager"] },
  { label: "Inventory", href: "/inventory", icon: Package, roles: ["admin", "manager", "inventory_manager"] },
  { label: "Staff", href: "/staff", icon: Users, roles: ["admin", "manager"] },
  { label: "Customers", href: "/customers", icon: Users2, roles: ["admin", "manager", "receptionist"] },
  { label: "Reports", href: "/reports", icon: BarChart3, roles: ["admin", "manager", "inventory_manager"] },
  { label: "Settings", href: "/settings", icon: Settings, roles: ["admin", "manager"] },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user, logout: localLogout } = useAuth();
  const logoutMutation = useLogout();

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (e) {
      console.error("Logout failed on server", e);
    } finally {
      localLogout();
    }
  };

  const allowedNavItems = navItems.filter((item) =>
    user && item.roles.includes(user.role)
  );

  const NavLinks = () => (
    <>
      <div className="mb-8 px-6">
        <h1 className="text-xl font-bold tracking-tight text-sidebar-primary">RestoraPro</h1>
        <p className="text-xs text-sidebar-foreground/60">{user?.name} ({user?.role})</p>
      </div>
      <nav className="flex-1 space-y-1 px-4">
        {allowedNavItems.map((item) => {
          const isActive = location.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 mt-auto">
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-sidebar border-r border-sidebar-border pt-6">
        <NavLinks />
      </aside>

      {/* Mobile Topbar & Sidebar */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-sidebar border-b border-sidebar-border">
          <h1 className="text-lg font-bold text-sidebar-primary">RestoraPro</h1>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-sidebar-foreground">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-sidebar p-0 pt-6 flex flex-col border-r-sidebar-border">
              <NavLinks />
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 overflow-auto bg-muted/30">
          {children}
        </main>
      </div>
    </div>
  );
}
