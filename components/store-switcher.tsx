"use client";

import { useShop, Shop } from "@/lib/context/shop-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, Store, Plus, Check } from "lucide-react";
import Link from "next/link";

export function StoreSwitcher() {
  const { shops, currentShop, setCurrentShop, isLoading } = useShop();

  if (isLoading) {
    return (
      <Button variant="outline" disabled className="w-[200px] justify-between">
        <span className="flex items-center gap-2">
          <Store className="h-4 w-4" />
          Loading...
        </span>
      </Button>
    );
  }

  if (shops.length === 0) {
    return (
      <Link href="/dashboard/connect">
        <Button variant="outline" className="w-[200px] justify-between">
          <span className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Connect Store
          </span>
        </Button>
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-[240px] justify-between">
          <span className="flex items-center gap-2 truncate">
            <Store className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {currentShop?.shop_name || currentShop?.shop_domain || "Select Store"}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[240px]" align="start">
        <DropdownMenuLabel>Your Stores</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {shops.map((shop) => (
          <DropdownMenuItem
            key={shop.id}
            onClick={() => setCurrentShop(shop)}
            className="flex items-center justify-between cursor-pointer"
          >
            <span className="flex flex-col">
              <span className="font-medium truncate">
                {shop.shop_name || shop.shop_domain}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {shop.shop_domain}
              </span>
            </span>
            {currentShop?.id === shop.id && (
              <Check className="h-4 w-4 shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            href="/dashboard/connect"
            className="flex items-center gap-2 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Connect Another Store
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
