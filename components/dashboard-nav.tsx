"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Users,
  Boxes,
  Settings,
  Activity,
  Droplet,
  TrendingUp,
} from "lucide-react";

const navigation = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Orders", href: "/dashboard/orders", icon: ShoppingBag },
  { name: "Products", href: "/dashboard/products", icon: Package },
  { name: "Customers", href: "/dashboard/customers", icon: Users },
  { name: "Inventory", href: "/dashboard/inventory", icon: Boxes },
  { name: "Activity", href: "/dashboard/activity", icon: Activity },
  { name: "Drip", href: "/dashboard/drip", icon: Droplet },
  { name: "Rise", href: "/dashboard/rise", icon: TrendingUp },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {navigation.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));

        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}
