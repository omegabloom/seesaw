"use client";

import { useState } from "react";
import { useShop } from "@/lib/context/shop-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Package, Users, Loader2, Check } from "lucide-react";

interface SeedResult {
  type: string;
  count: number;
  timestamp: Date;
}

export function DevSeeder() {
  const { currentShop } = useShop();
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SeedResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const quickSeed = async (type: "order" | "customer", num: number) => {
    if (!currentShop) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: currentShop.id,
          type: type,
          count: num,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to seed data");
      }
      
      setResults(prev => [{
        type: type,
        count: data.created,
        timestamp: new Date(),
      }, ...prev].slice(0, 10));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentShop) {
    return null;
  }

  // Only show in development
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return (
    <Card className="border-dashed border-yellow-500/50 bg-yellow-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          <CardTitle className="text-lg">Dev Seeder</CardTitle>
          <Badge variant="outline" className="text-yellow-600 border-yellow-500/50">
            Development Only
          </Badge>
        </div>
        <CardDescription>
          Generate mock orders and customers for testing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => quickSeed("order", 1)}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Package className="h-4 w-4 mr-1" />}
            +1 Order
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => quickSeed("order", 5)}
            disabled={isLoading}
          >
            <Package className="h-4 w-4 mr-1" />
            +5 Orders
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => quickSeed("order", 10)}
            disabled={isLoading}
          >
            <Package className="h-4 w-4 mr-1" />
            +10 Orders
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => quickSeed("order", 25)}
            disabled={isLoading}
          >
            <Package className="h-4 w-4 mr-1" />
            +25 Orders
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => quickSeed("customer", 5)}
            disabled={isLoading}
          >
            <Users className="h-4 w-4 mr-1" />
            +5 Customers
          </Button>
        </div>

        {/* Error */}
        {error && (
          <div className="text-sm text-red-500 bg-red-500/10 p-2 rounded">
            {error}
          </div>
        )}

        {/* Recent Results */}
        {results.length > 0 && (
          <div className="space-y-1 pt-2 border-t">
            <p className="text-xs text-muted-foreground">Recent</p>
            <div className="flex flex-wrap gap-2">
              {results.map((r, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  <Check className="h-3 w-3 mr-1 text-green-500" />
                  {r.count} {r.type}{r.count > 1 ? "s" : ""} @ {r.timestamp.toLocaleTimeString()}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
