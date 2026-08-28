import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetMe, useLogout, useGetSettings } from "@workspace/api-client-react";
import {
  LayoutDashboard,
  Package,
  Users,
  Truck,
  ShoppingCart,
  LogOut,
  Boxes,
  FileText,
  Undo2,
  ReceiptText,
  BarChart3,
  Wallet,
  TrendingDown,
  TrendingUp,
  Building2,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import fallbackLogo from "/logo.png";

interface LayoutProps {
  children: ReactNode;
}

const navSections = [
  {
    label: "Main",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/products", label: "Products", icon: Package },
      { href: "/inventory", label: "Inventory", icon: Boxes },
      { href: "/customers", label: "Customers", icon: Users },
    ],
  },
  {
    label: "Sales",
    items: [
      { href: "/sales", label: "Sales Register", icon: ReceiptText },
      { href: "/sales/entry", label: "Sales Entry", icon: ShoppingCart },
      { href: "/reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    label: "Purchases",
    items: [
      { href: "/purchases/suppliers", label: "Suppliers", icon: Truck },
      { href: "/purchases/entry", label: "Purchase Entry", icon: ShoppingCart },
      { href: "/purchases/register", label: "Purchase Register", icon: FileText },
      { href: "/purchases/returns", label: "Purchase Returns", icon: Undo2 },
    ],
  },
  {
    label: "Accounts",
    items: [
      { href: "/accounts", label: "Accounts", icon: Wallet },
      { href: "/accounts/expense-entry", label: "Expense Entry", icon: TrendingDown },
      { href: "/accounts/income-entry", label: "Income Entry", icon: TrendingUp },
      { href: "/accounts/cash-book", label: "Cash Book", icon: Wallet },
      { href: "/accounts/bank-book", label: "Bank Book", icon: Building2 },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/settings", label: "Business Settings", icon: Settings },
    ],
  },
];

function SidebarContent({
  location,
  user,
  onNavClick,
  onLogout,
  isPending,
  bizName,
  bizLogo,
}: {
  location: string;
  user: { name: string; role: string };
  onNavClick: () => void;
  onLogout: () => void;
  isPending: boolean;
  bizName: string;
  bizLogo: string;
}) {
  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-4 border-b border-sidebar-border flex-shrink-0">
        <img src={bizLogo} alt="Logo" className="w-9 h-9 object-contain flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).src = fallbackLogo; }} />
        <div className="leading-tight">
          <div className="font-bold text-sidebar-foreground tracking-wide text-sm">{bizName}</div>
          <div className="text-[10px] text-sidebar-foreground/50 uppercase tracking-widest">ERP System</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {navSections.map((section) => (
          <div key={section.label}>
            <div className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 select-none">
              {section.label}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  location === item.href ||
                  (item.href !== "/accounts" && location.startsWith(item.href + "/")) ||
                  (item.href === "/accounts" && location === "/accounts");
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavClick}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md transition-colors text-[13px] ${
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold border-l-2 border-accent pl-[10px]"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? "text-accent" : ""}`} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-sidebar-border flex-shrink-0">
        <div className="flex items-center gap-2.5 px-2 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-[12px] font-bold text-sidebar flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-sidebar-foreground truncate">{user.name}</div>
            <div className="text-[10px] text-sidebar-foreground/50 capitalize truncate">{user.role}</div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 text-[13px] h-9"
          onClick={onLogout}
          disabled={isPending}
        >
          <LogOut className="w-3.5 h-3.5 mr-2" />
          {isPending ? "Logging out…" : "Logout"}
        </Button>
      </div>
    </div>
  );
}

export function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const { data: user, isLoading, error } = useGetMe();
  const { data: settings } = useGetSettings();
  const logoutMutation = useLogout();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const bizName = settings?.businessName || "HIMSARU";
  const bizLogo = settings?.logoData || fallbackLogo;

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  useEffect(() => {
    if (!isLoading && (error || !user)) {
      setLocation("/login");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, error, user]);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-sm text-muted-foreground">Loading ERP…</span>
        </div>
      </div>
    );
  }

  if (error || !user) return null;

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => setLocation("/login"),
    });
  };

  // Current page label for top bar
  const pageLabel = (() => {
    const seg = location.replace(/^\//, "").replace(/\//g, " › ");
    return seg || "Dashboard";
  })();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-sm">

      {/* ── Mobile overlay backdrop ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar — desktop: fixed column; mobile: slide-in drawer ── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-60 flex-shrink-0
          transform transition-transform duration-200 ease-in-out
          lg:static lg:translate-x-0 lg:flex lg:flex-col
          border-r border-sidebar-border
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Mobile close button */}
        <button
          className="absolute top-3 right-3 z-50 lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="w-5 h-5" />
        </button>

        <SidebarContent
          location={location}
          user={user}
          onNavClick={() => setSidebarOpen(false)}
          onLogout={handleLogout}
          isPending={logoutMutation.isPending}
          bizName={bizName}
          bizLogo={bizLogo}
        />
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <div className="h-14 border-b border-border bg-card flex items-center px-4 gap-3 flex-shrink-0">
          {/* Hamburger — mobile only */}
          <button
            className="lg:hidden p-1.5 rounded-md text-foreground/60 hover:text-foreground hover:bg-muted transition-colors"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo pill — mobile only */}
          <div className="lg:hidden flex items-center gap-2">
            <img src={bizLogo} alt="Logo" className="w-7 h-7 object-contain" onError={(e) => { (e.target as HTMLImageElement).src = fallbackLogo; }} />
            <span className="font-bold text-foreground text-sm tracking-wide">{bizName}</span>
          </div>

          <div className="flex-1 hidden lg:block">
            <h1 className="text-sm font-semibold text-foreground/70 capitalize">{pageLabel}</h1>
          </div>

          <div className="ml-auto text-xs text-muted-foreground hidden sm:block">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </div>
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
