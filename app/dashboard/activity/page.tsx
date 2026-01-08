"use client";

import { useShop } from "@/lib/context/shop-context";
import { useShopRealtime, RealtimeEvent } from "@/lib/hooks/use-realtime";
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
import {
  ShoppingBag,
  Package,
  Users,
  Boxes,
  Clock,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ActivityPage() {
  const { currentShop } = useShop();
  const { lastEvent, isConnected } = useShopRealtime(currentShop?.id || null);
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEvents = async () => {
    if (!currentShop) return;

    setIsLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("realtime_events")
      .select("*")
      .eq("shop_id", currentShop.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching events:", error);
    } else {
      setEvents(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, [currentShop]);

  // Add new events to the top of the list
  useEffect(() => {
    if (lastEvent && currentShop) {
      setEvents((prev) => [lastEvent, ...prev].slice(0, 50));
    }
  }, [lastEvent, currentShop]);

  const getEventIcon = (eventType: string) => {
    if (eventType.includes("order")) return ShoppingBag;
    if (eventType.includes("product")) return Package;
    if (eventType.includes("customer")) return Users;
    if (eventType.includes("inventory")) return Boxes;
    return Clock;
  };

  const getEventColor = (eventType: string) => {
    if (eventType.includes("created")) return "text-green-500";
    if (eventType.includes("updated")) return "text-blue-500";
    if (eventType.includes("deleted")) return "text-red-500";
    if (eventType.includes("paid") || eventType.includes("fulfilled"))
      return "text-green-500";
    if (eventType.includes("cancelled")) return "text-red-500";
    return "text-muted-foreground";
  };

  const formatEventType = (eventType: string) => {
    return eventType
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getEventDescription = (event: RealtimeEvent) => {
    const { payload, event_type } = event;

    switch (event_type) {
      case "order_created":
      case "order_updated":
      case "order_paid":
      case "order_fulfilled":
      case "order_cancelled":
        return `${payload?.name || "Order"} - ${payload?.customer_email || "No email"} - ${
          payload?.total_price ? `$${payload.total_price}` : ""
        }`;
      case "product_created":
      case "product_updated":
      case "product_deleted":
        return `${payload?.title || "Product"} - ${payload?.variants_count || 0} variants`;
      case "customer_created":
      case "customer_updated":
      case "customer_deleted":
        return `${payload?.name || payload?.email || "Customer"} - ${
          payload?.orders_count || 0
        } orders`;
      case "inventory_updated":
        return `Item #${payload?.inventory_item_id} - ${payload?.available} available`;
      default:
        return JSON.stringify(payload).slice(0, 100);
    }
  };

  if (!currentShop) {
    return (
      <div className="text-muted-foreground">
        Select a store to view activity.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Activity</h1>
          <p className="text-muted-foreground">
            Real-time activity feed for {currentShop.shop_name || currentShop.shop_domain}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div
            className={`flex items-center gap-2 text-sm ${
              isConnected ? "text-green-500" : "text-muted-foreground"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isConnected ? "bg-green-500 animate-pulse" : "bg-muted-foreground"
              }`}
            />
            {isConnected ? "Live" : "Connecting..."}
          </div>
          <Button variant="outline" onClick={fetchEvents} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            {events.length} event{events.length !== 1 ? "s" : ""} in the last 24
            hours
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading activity...
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No activity yet. Events will appear here as they happen.
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event, index) => {
                const Icon = getEventIcon(event.event_type);
                const isNew = index === 0 && lastEvent?.id === event.id;

                return (
                  <div
                    key={event.id}
                    className={`flex items-start gap-4 p-3 rounded-lg transition-colors ${
                      isNew ? "bg-primary/5 border border-primary/20" : "hover:bg-muted/50"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-full bg-muted ${getEventColor(
                        event.event_type
                      )}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {formatEventType(event.event_type)}
                        </Badge>
                        {isNew && (
                          <Badge variant="default" className="text-xs">
                            New
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm mt-1 truncate">
                        {getEventDescription(event)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(event.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
