"use client";

import Link from "next/link";
import { StoreSwitcher } from "@/components/store-switcher";
import { NavDropdown } from "@/components/nav-dropdown";
import { useViewMode } from "@/lib/context/view-mode-context";

export function DashboardHeader() {
  const { isViewOpen } = useViewMode();

  if (isViewOpen) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 gap-4">
        <Link href="/dashboard">
          <img src="/seesaw_icon.png" alt="Seesaw" className="h-8 w-auto" />
        </Link>
        <StoreSwitcher />
        <div className="flex-1" />
        <NavDropdown />
      </div>
    </header>
  );
}
