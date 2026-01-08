"use client";

import { useShop } from "@/lib/context/shop-context";
import { useResourceRealtime } from "@/lib/hooks/use-realtime";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingBag,
  Package,
  Users,
  DollarSign,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

interface Stats {
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  totalCustomers: number;
  recentOrders: any[];
}

export default function DashboardPage() {
  const { currentShop, shops, isLoading: shopsLoading } = useShop();
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { events: orderEvents } = useResourceRealtime(
    currentShop?.id || null,
    "order"
  );

  useEffect(() => {
    async function fetchStats() {
      if (!currentShop) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const supabase = createClient();

      try {
        // Fetch order stats
        const { count: orderCount } = await supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("shop_id", currentShop.id);

        // Fetch revenue (sum of paid orders)
        const { data: revenueData } = await supabase
          .from("orders")
          .select("total_price")
          .eq("shop_id", currentShop.id)
          .eq("financial_status", "paid");

        const totalRevenue = (revenueData || []).reduce(
          (sum, order) => sum + (parseFloat(order.total_price) || 0),
          0
        );

        // Fetch product count
        const { count: productCount } = await supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .eq("shop_id", currentShop.id);

        // Fetch customer count
        const { count: customerCount } = await supabase
          .from("customers")
          .select("*", { count: "exact", head: true })
          .eq("shop_id", currentShop.id);

        // Fetch recent orders
        const { data: recentOrders } = await supabase
          .from("orders")
          .select("*")
          .eq("shop_id", currentShop.id)
          .order("created_at_shopify", { ascending: false })
          .limit(5);

        setStats({
          totalOrders: orderCount || 0,
          totalRevenue,
          totalProducts: productCount || 0,
          totalCustomers: customerCount || 0,
          recentOrders: recentOrders || [],
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, [currentShop, orderEvents]); // Refetch when new orders come in

  if (shopsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (shops.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <h2 className="text-2xl font-bold">Welcome to Seesaw!</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Connect your first Shopify store to start tracking orders, products,
          customers, and inventory in real-time.
        </p>
        <Link
          href="/dashboard/connect"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
        >
          Connect Shopify Store
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  if (!currentShop) {
    return (
      <div className="text-muted-foreground">
        Select a store from the dropdown above.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview for {currentShop.shop_name || currentShop.shop_domain}
        </p>
      </div>

      {/* Live Order Events */}
      {orderEvents.length > 0 && (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              Live Updates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {orderEvents.slice(0, 3).map((event) => (
                <div key={event.id} className="text-sm flex items-center gap-2">
                  <Badge variant="secondary">{event.event_type.replace(/_/g, " ")}</Badge>
                  <span className="text-muted-foreground">
                    {event.payload?.name || event.payload?.title || `#${event.shopify_id}`}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : stats?.totalOrders.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Last 90 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading
                ? "..."
                : new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: currentShop.currency || "USD",
                  }).format(stats?.totalRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Paid orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : stats?.totalProducts.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Active products</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "..." : stats?.totalCustomers.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Total customers</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>Latest orders from your store</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-muted-foreground">Loading...</div>
          ) : stats?.recentOrders.length === 0 ? (
            <div className="text-muted-foreground">No orders yet</div>
          ) : (
            <div className="space-y-4">
              {stats?.recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{order.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {order.email || "No email"}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge
                      variant={
                        order.financial_status === "paid"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {order.financial_status}
                    </Badge>
                    <span className="font-medium">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: order.currency || "USD",
                      }).format(parseFloat(order.total_price))}
                    </span>
                  </div>
                </div>
              ))}
              <Link
                href="/dashboard/orders"
                className="inline-flex items-center text-sm text-primary hover:underline"
              >
                View all orders
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
