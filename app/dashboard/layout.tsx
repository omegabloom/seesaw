import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ShopProvider } from "@/lib/context/shop-context";
import { ViewModeProvider } from "@/lib/context/view-mode-context";
import { DashboardHeader } from "@/components/dashboard-header";

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
      <ViewModeProvider>
        <div className="min-h-screen flex flex-col">
          <DashboardHeader />
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
      </ViewModeProvider>
    </ShopProvider>
  );
}
