"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
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
  Menu,
  LogOut,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

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

export function NavDropdown() {
  const pathname = usePathname();
  const router = useRouter();

  // Find current page name
  const currentPage = navigation.find(
    (item) =>
      pathname === item.href ||
      (item.href !== "/dashboard" && pathname.startsWith(item.href))
  );

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2">
          <Menu className="h-4 w-4" />
          <span>{currentPage?.name || "Menu"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <DropdownMenuItem key={item.name} asChild>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 w-full",
                  isActive && "bg-accent"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="flex items-center gap-3 text-red-500 focus:text-red-500"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
