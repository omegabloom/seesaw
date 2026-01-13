"use client";

import { useShop } from "@/lib/context/shop-context";
import { useResourceRealtime } from "@/lib/hooks/use-realtime";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DevSeeder } from "@/components/dev-seeder";

interface Order {
  id: string;
  name: string;
  email: string | null;
  financial_status: string;
  fulfillment_status: string | null;
  total_price: number;
  currency: string;
  line_items: any[];
  created_at_shopify: string;
}

export default function OrdersPage() {
  const { currentShop } = useShop();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { events: orderEvents } = useResourceRealtime(
    currentShop?.id || null,
    "order"
  );

  const fetchOrders = async (silent = false) => {
    if (!currentShop) return;

    if (!silent) setIsLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("shop_id", currentShop.id)
      .order("created_at_shopify", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error fetching orders:", error);
    } else {
      setOrders(data || []);
      setFilteredOrders(data || []);
    }
    if (!silent) setIsLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, [currentShop]);

  // Refetch when new order events come in
  useEffect(() => {
    if (orderEvents.length > 0) {
      fetchOrders(true); // Silent refetch
    }
  }, [orderEvents]);

  // Filter orders based on search
  useEffect(() => {
    if (!searchQuery) {
      setFilteredOrders(orders);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredOrders(
        orders.filter(
          (order) =>
            order.name?.toLowerCase().includes(query) ||
            order.email?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, orders]);

  if (!currentShop) {
    return (
      <div className="text-muted-foreground">
        Select a store to view orders.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground">
            View and manage orders from {currentShop.shop_name || currentShop.shop_domain}
          </p>
        </div>
        <Button variant="outline" onClick={() => fetchOrders()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Dev Seeder */}
      <DevSeeder />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search orders by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Live Events Indicator */}
      {orderEvents.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
          {orderEvents.length} new update{orderEvents.length > 1 ? "s" : ""}
        </div>
      )}

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>All Orders</CardTitle>
          <CardDescription>
            {filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading orders...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No orders found
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{order.name}</span>
                      <Badge
                        variant={
                          order.financial_status === "paid"
                            ? "default"
                            : order.financial_status === "pending"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {order.financial_status}
                      </Badge>
                      {order.fulfillment_status && (
                        <Badge variant="outline">{order.fulfillment_status}</Badge>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {order.email || "No email"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(order.created_at_shopify).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: order.currency || "USD",
                      }).format(order.total_price)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {order.line_items?.length || 0} item
                      {(order.line_items?.length || 0) !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
