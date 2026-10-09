import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import {
  LayoutGrid,
  BedDouble,
  UtensilsCrossed,
  BarChart3,
  ClipboardList,
  Settings as SettingsIcon,
  LogOut,
  Menu,
} from "lucide-react";
import { HOTEL_NAME, HOTEL_ADDRESS } from "@contracts/types";
import { useAuth } from "@/providers/auth";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const NAV = [
  { to: "/", label: "Front Desk", icon: LayoutGrid, end: true },
  { to: "/bookings", label: "Bookings", icon: BedDouble },
  { to: "/registration", label: "Registration Cards", icon: ClipboardList },
  { to: "/pos", label: "Restaurant POS", icon: UtensilsCrossed },
  { to: "/reports", label: "Billing & Reports", icon: BarChart3, adminOnly: true },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

type NavItem = (typeof NAV)[number];

function NavItems({
  items,
  onNavigate,
}: {
  items: NavItem[];
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 py-4">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 px-6 py-3.5 text-sm transition-colors border-l-2 ${
              isActive
                ? "border-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "border-transparent text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            }`
          }
        >
          <Icon className="h-4 w-4" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const items = NAV.filter((n) => !n.adminOnly || user?.role === "admin");

  const signOut = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const userBlock = (
    <div className="px-6 py-4 border-t border-sidebar-border">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{user?.name}</div>
          <Badge variant="secondary" className="mt-1 text-[10px] uppercase tracking-wide">
            {user?.role}
          </Badge>
        </div>
        <button
          title="Sign out"
          className="p-3 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 bg-sidebar text-sidebar-foreground flex-col fixed inset-y-0">
        <div className="px-6 pt-8 pb-6 border-b border-sidebar-border">
          <div className="font-display text-2xl leading-tight font-semibold text-sidebar-primary-foreground">
            {HOTEL_NAME}
          </div>
          <div className="text-[11px] tracking-[0.18em] uppercase text-sidebar-primary mt-1">
            Uttara, Dhaka
          </div>
        </div>
        <NavItems items={items} />
        {userBlock}
        <div className="px-6 py-3 border-t border-sidebar-border text-[11px] text-sidebar-foreground/50">
          {HOTEL_ADDRESS}
        </div>
      </aside>

      {/* Mobile top bar with drawer menu */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center gap-3 bg-sidebar text-sidebar-foreground px-4 py-3 border-b border-sidebar-border">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <button
              aria-label="Open menu"
              className="p-2 -ml-2 rounded-md hover:bg-sidebar-accent min-h-11 min-w-11 flex items-center justify-center"
            >
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-64 p-0 bg-sidebar text-sidebar-foreground border-sidebar-border flex flex-col"
          >
            <SheetHeader className="px-6 pt-6 pb-4 border-b border-sidebar-border text-left">
              <SheetTitle className="font-display text-xl font-semibold text-sidebar-primary-foreground">
                {HOTEL_NAME}
              </SheetTitle>
              <div className="text-[11px] tracking-[0.18em] uppercase text-sidebar-primary">
                Uttara, Dhaka
              </div>
            </SheetHeader>
            <NavItems items={items} onNavigate={() => setMenuOpen(false)} />
            {userBlock}
            <div className="px-6 py-3 border-t border-sidebar-border text-[11px] text-sidebar-foreground/50">
              {HOTEL_ADDRESS}
            </div>
          </SheetContent>
        </Sheet>
        <div className="font-display text-lg font-semibold text-sidebar-primary-foreground truncate">
          {HOTEL_NAME}
        </div>
      </header>

      <main className="lg:ml-60 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
