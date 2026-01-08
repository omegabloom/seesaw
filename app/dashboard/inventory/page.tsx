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
import { Search, RefreshCw, MapPin, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InventoryLevel {
  id: string;
  shopify_inventory_item_id: number;
  shopify_location_id: number;
  location_name: string | null;
  available: number;
  inventory_items: {
    sku: string | null;
    shopify_variant_id: number | null;
  } | null;
}

interface Location {
  id: string;
  name: string;
  shopify_location_id: number;
}

export default function InventoryPage() {
  const { currentShop } = useShop();
  const [inventoryLevels, setInventoryLevels] = useState<InventoryLevel[]>([]);
  const [filteredLevels, setFilteredLevels] = useState<InventoryLevel[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string | "all">("all");
  const { events: inventoryEvents } = useResourceRealtime(
    currentShop?.id || null,
    "inventory"
  );

  const fetchInventory = async () => {
    if (!currentShop) return;

    setIsLoading(true);
    const supabase = createClient();

    // Fetch locations
    const { data: locationsData } = await supabase
      .from("locations")
      .select("*")
      .eq("shop_id", currentShop.id);

    setLocations(locationsData || []);

    // Fetch inventory levels with item info
    const { data, error } = await supabase
      .from("inventory_levels")
      .select(`
        *,
        inventory_items (
          sku,
          shopify_variant_id
        )
      `)
      .eq("shop_id", currentShop.id)
      .order("available", { ascending: true });

    if (error) {
      console.error("Error fetching inventory:", error);
    } else {
      setInventoryLevels(data || []);
      setFilteredLevels(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchInventory();
  }, [currentShop]);

  useEffect(() => {
    if (inventoryEvents.length > 0) {
      fetchInventory();
    }
  }, [inventoryEvents]);

  useEffect(() => {
    let filtered = inventoryLevels;

    // Filter by location
    if (selectedLocation !== "all") {
      filtered = filtered.filter(
        (level) => level.shopify_location_id.toString() === selectedLocation
      );
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (level) =>
          level.inventory_items?.sku?.toLowerCase().includes(query) ||
          level.location_name?.toLowerCase().includes(query)
      );
    }

    setFilteredLevels(filtered);
  }, [searchQuery, selectedLocation, inventoryLevels]);

  const lowStockCount = inventoryLevels.filter(
    (level) => level.available > 0 && level.available <= 5
  ).length;
  const outOfStockCount = inventoryLevels.filter(
    (level) => level.available <= 0
  ).length;

  if (!currentShop) {
    return (
      <div className="text-muted-foreground">
        Select a store to view inventory.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory</h1>
          <p className="text-muted-foreground">
            Track inventory levels for {currentShop.shop_name || currentShop.shop_domain}
          </p>
        </div>
        <Button variant="outline" onClick={fetchInventory} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventoryLevels.length}</div>
          </CardContent>
        </Card>
        <Card className={lowStockCount > 0 ? "border-yellow-500/50" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Low Stock
              {lowStockCount > 0 && (
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockCount}</div>
            <p className="text-xs text-muted-foreground">5 or fewer units</p>
          </CardContent>
        </Card>
        <Card className={outOfStockCount > 0 ? "border-red-500/50" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Out of Stock
              {outOfStockCount > 0 && (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{outOfStockCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by SKU or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
          className="px-3 py-2 border rounded-md bg-background"
        >
          <option value="all">All Locations</option>
          {locations.map((location) => (
            <option key={location.id} value={location.shopify_location_id.toString()}>
              {location.name}
            </option>
          ))}
        </select>
      </div>

      {inventoryEvents.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
          {inventoryEvents.length} inventory update{inventoryEvents.length > 1 ? "s" : ""}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Inventory Levels</CardTitle>
          <CardDescription>
            {filteredLevels.length} item{filteredLevels.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading inventory...
            </div>
          ) : filteredLevels.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No inventory data found
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLevels.map((level) => (
                <div
                  key={level.id}
                  className={`flex items-center justify-between p-3 border rounded-lg ${
                    level.available <= 0
                      ? "border-red-500/50 bg-red-500/5"
                      : level.available <= 5
                      ? "border-yellow-500/50 bg-yellow-500/5"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium">
                        {level.inventory_items?.sku || `Item #${level.shopify_inventory_item_id}`}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {level.location_name || `Location #${level.shopify_location_id}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        level.available <= 0
                          ? "destructive"
                          : level.available <= 5
                          ? "secondary"
                          : "default"
                      }
                    >
                      {level.available} available
                    </Badge>
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
