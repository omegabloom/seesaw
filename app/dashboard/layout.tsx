import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ShopProvider } from "@/lib/context/shop-context";
import { StoreSwitcher } from "@/components/store-switcher";
import { DashboardNav } from "@/components/dashboard-nav";
import { RealtimeIndicator } from "@/components/realtime-indicator";
import { LogoutButton } from "@/components/logout-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import Link from "next/link";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <ShopProvider>
      <div className="min-h-screen flex flex-col">
        {/* Top Navigation */}
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center px-4 gap-4">
            <Link href="/dashboard" className="font-bold text-xl">
              Seesaw
            </Link>
            <StoreSwitcher />
            <div className="flex-1" />
            <RealtimeIndicator />
            <ThemeSwitcher />
            <LogoutButton />
          </div>
        </header>

        <div className="flex-1 flex">
          {/* Sidebar */}
          <aside className="hidden md:flex w-64 flex-col border-r bg-muted/10 p-4">
            <DashboardNav />
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </ShopProvider>
  );
}
