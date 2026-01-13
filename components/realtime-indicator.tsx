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

  // Only show when connected - hide offline state for cleaner TV display
  if (!isConnected) return null;

  return (
    <div className="flex items-center gap-2">
      {showEvent && lastEvent && (
        <Badge variant="secondary" className="animate-pulse">
          {formatEventType(lastEvent.event_type)}
        </Badge>
      )}
      <div className="flex items-center gap-1 text-xs text-green-500">
        <Wifi className="h-3 w-3" />
        <span>Live</span>
      </div>
    </div>
  );
}

function formatEventType(eventType: string): string {
  return eventType
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}
