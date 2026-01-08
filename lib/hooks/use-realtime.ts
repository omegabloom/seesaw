"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface RealtimeEvent {
  id: string;
  shop_id: string;
  event_type: string;
  resource_type: string;
  resource_id: string | null;
  shopify_id: number | null;
  payload: any;
  created_at: string;
}

type EventCallback = (event: RealtimeEvent) => void;

/**
 * Hook to subscribe to realtime events for a specific shop
 */
export function useShopRealtime(shopId: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const [listeners, setListeners] = useState<Map<string, EventCallback[]>>(
    new Map()
  );

  useEffect(() => {
    if (!shopId) return;

    const supabase = createClient();
    let channel: RealtimeChannel;

    const setupChannel = async () => {
      console.log(`[Realtime Hook] Setting up channel for shop: ${shopId}`);
      
      channel = supabase
        .channel(`shop:${shopId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "realtime_events",
            filter: `shop_id=eq.${shopId}`,
          },
          (payload) => {
            console.log("[Realtime Hook] Received event:", payload);
            const event = payload.new as RealtimeEvent;
            setLastEvent(event);

            // Call registered listeners for this event type
            const eventListeners = listeners.get(event.event_type) || [];
            eventListeners.forEach((callback) => callback(event));

            // Call wildcard listeners
            const wildcardListeners = listeners.get("*") || [];
            wildcardListeners.forEach((callback) => callback(event));
          }
        )
        .subscribe((status) => {
          console.log(`[Realtime Hook] Subscription status: ${status}`);
          setIsConnected(status === "SUBSCRIBED");
        });
    };

    setupChannel();

    return () => {
      if (channel) {
        console.log(`[Realtime Hook] Cleaning up channel for shop: ${shopId}`);
        supabase.removeChannel(channel);
      }
    };
  }, [shopId, listeners]);

  const addEventListener = useCallback(
    (eventType: string, callback: EventCallback) => {
      setListeners((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(eventType) || [];
        newMap.set(eventType, [...existing, callback]);
        return newMap;
      });

      // Return cleanup function
      return () => {
        setListeners((prev) => {
          const newMap = new Map(prev);
          const existing = newMap.get(eventType) || [];
          newMap.set(
            eventType,
            existing.filter((cb) => cb !== callback)
          );
          return newMap;
        });
      };
    },
    []
  );

  return {
    isConnected,
    lastEvent,
    addEventListener,
  };
}

/**
 * Hook to subscribe to specific resource type changes
 */
export function useResourceRealtime(
  shopId: string | null,
  resourceType: "order" | "product" | "customer" | "inventory"
) {
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const { isConnected, addEventListener } = useShopRealtime(shopId);

  useEffect(() => {
    if (!shopId) return;

    // Subscribe to all events for this resource type
    const eventTypes = getEventTypesForResource(resourceType);
    const cleanups: (() => void)[] = [];

    eventTypes.forEach((eventType) => {
      const cleanup = addEventListener(eventType, (event) => {
        setEvents((prev) => [event, ...prev].slice(0, 50)); // Keep last 50
      });
      cleanups.push(cleanup);
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [shopId, resourceType, addEventListener]);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return {
    isConnected,
    events,
    clearEvents,
  };
}

function getEventTypesForResource(
  resourceType: "order" | "product" | "customer" | "inventory"
): string[] {
  switch (resourceType) {
    case "order":
      return [
        "order_created",
        "order_updated",
        "order_paid",
        "order_cancelled",
        "order_fulfilled",
      ];
    case "product":
      return ["product_created", "product_updated", "product_deleted"];
    case "customer":
      return ["customer_created", "customer_updated", "customer_deleted"];
    case "inventory":
      return ["inventory_updated"];
    default:
      return [];
  }
}
