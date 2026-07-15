import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Wallet,
  Package,
  UserCog,
  LogOut,
  Menu,
  Scissors,
  Shirt,
  X,
} from "lucide-react";
import { useAuth, useRole } from "@/features/auth/AuthProvider";
import type { Role } from "@/lib/database.types";
import { config } from "@/lib/config";
import { cn } from "@/lib/utils";
import { OfflineBanner } from "./OfflineBanner";

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  roles: Role[];
}

const NAV: NavItem[] = [
  {
    to: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["owner", "counter", "tailor"],
  },
  {
    to: "/orders",
    label: "Orders",
    icon: ClipboardList,
    roles: ["owner", "counter", "tailor"],
  },
  {
    to: "/customers",
    label: "Customers",
    icon: Users,
    roles: ["owner", "counter"],
  },
  {
    to: "/collections",
    label: "Collections",
    icon: Wallet,
    roles: ["owner"],
  },
  {
    to: "/inventory",
    label: "Inventory",
    icon: Package,
    roles: ["owner", "counter"],
  },
  {
    to: "/settings/garments",
    label: "Garment Types",
    icon: Shirt,
    roles: ["owner"],
  },
  { to: "/staff", label: "Staff", icon: UserCog, roles: ["owner"] },
];

export function AppLayout() {
  const { profile, signOut } = useAuth();
  const { role } = useRole();
  const [open, setOpen] = useState(false);

  const items = NAV.filter((n) => role && n.roles.includes(role));

  return (
    <div className="flex min-h-screen bg-accent/20">
      {/* Sidebar (drawer on tablet portrait) */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-card shadow-lg transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b p-5">
          <div className="flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Scissors className="size-5" />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight">
                {config.shop.name}
              </p>
              <p className="text-xs text-muted-foreground">OMS</p>
            </div>
          </div>
          <button
            className="flex size-11 items-center justify-center rounded-md active:bg-accent lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-4 py-3 text-base font-medium",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground active:bg-accent",
                )
              }
            >
              <item.icon className="size-5 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t p-3">
          <div className="mb-2 px-2">
            <p className="truncate text-sm font-medium">{profile?.full_name}</p>
            <p className="text-xs capitalize text-muted-foreground">{role}</p>
          </div>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-md px-4 py-3 text-base font-medium text-destructive active:bg-destructive/10"
          >
            <LogOut className="size-5" /> Sign Out
          </button>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-card/95 px-4 py-3 backdrop-blur lg:hidden">
          <button
            className="flex size-11 items-center justify-center rounded-md active:bg-accent"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-6" />
          </button>
          <span className="font-semibold">{config.shop.name}</span>
        </header>
        <OfflineBanner />
        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
