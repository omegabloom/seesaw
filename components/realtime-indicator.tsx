"use client";

import { useShopRealtime, RealtimeEvent } from "@/lib/hooks/use-realtime";
import { useShop } from "@/lib/context/shop-context";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff } from "lucide-react";

export function RealtimeIndicator() {
  const { currentShop } = useShop();
  const { isConnected, lastEvent } = useShopRealtime(currentShop?.id || null);
  const [showEvent, setShowEvent] = useState(false);

  useEffect(() => {
    if (lastEvent) {
      setShowEvent(true);
      const timer = setTimeout(() => setShowEvent(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [lastEvent]);

  return (
    <div className="flex items-center gap-2">
      {showEvent && lastEvent && (
        <Badge variant="secondary" className="animate-pulse">
          {formatEventType(lastEvent.event_type)}
        </Badge>
      )}
      <div
        className={`flex items-center gap-1 text-xs ${
          isConnected ? "text-green-500" : "text-muted-foreground"
        }`}
      >
        {isConnected ? (
          <Wifi className="h-3 w-3" />
        ) : (
          <WifiOff className="h-3 w-3" />
        )}
        <span>{isConnected ? "Live" : "Offline"}</span>
      </div>
    </div>
  );
}

function formatEventType(eventType: string): string {
  return eventType
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}
