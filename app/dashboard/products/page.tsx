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
import { Search, RefreshCw, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Product {
  id: string;
  title: string;
  description: string | null;
  vendor: string | null;
  product_type: string | null;
  status: string;
  tags: string[];
  variants: any[];
  images: any[];
  created_at_shopify: string;
}

export default function ProductsPage() {
  const { currentShop } = useShop();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const { events: productEvents, isConnected } = useResourceRealtime(
    currentShop?.id || null,
    "product"
  );

  const fetchProducts = async (silent = false) => {
    if (!currentShop) return;

    if (!silent) setIsLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("shop_id", currentShop.id)
      .order("title", { ascending: true });

    if (error) {
      console.error("Error fetching products:", error);
    } else {
      setProducts(data || []);
      setFilteredProducts(data || []);
    }
    if (!silent) setIsLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, [currentShop]);

  useEffect(() => {
    if (productEvents.length > 0) {
      setLastUpdate(new Date());
      fetchProducts(true); // Silent refetch for realtime updates
    }
  }, [productEvents]);

  useEffect(() => {
    if (!searchQuery) {
      setFilteredProducts(products);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredProducts(
        products.filter(
          (product) =>
            product.title?.toLowerCase().includes(query) ||
            product.vendor?.toLowerCase().includes(query) ||
            product.product_type?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, products]);

  if (!currentShop) {
    return (
      <div className="text-muted-foreground">
        Select a store to view products.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground">
            View products from {currentShop.shop_name || currentShop.shop_domain}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Realtime connection indicator */}
          <div className="flex items-center gap-2 text-sm">
            <span className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
            <span className="text-muted-foreground">
              {isConnected ? "Live" : "Disconnected"}
            </span>
          </div>
          {lastUpdate && (
            <span className="text-xs text-muted-foreground">
              Updated {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <Button variant="outline" onClick={() => fetchProducts()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search products by title, vendor, or type..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {productEvents.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
          {productEvents.length} product update{productEvents.length > 1 ? "s" : ""}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Products</CardTitle>
          <CardDescription>
            {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading products...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No products found
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 bg-muted rounded flex items-center justify-center shrink-0">
                      {product.images?.[0]?.src ? (
                        <img
                          src={product.images[0].src}
                          alt={product.title}
                          className="h-12 w-12 object-cover rounded"
                        />
                      ) : (
                        <Package className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{product.title}</h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {product.vendor || "No vendor"}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge
                          variant={
                            product.status === "active" ? "default" : "secondary"
                          }
                        >
                          {product.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {product.variants?.length || 0} variant
                          {(product.variants?.length || 0) !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                  {product.tags && product.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {product.tags.slice(0, 3).map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {product.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{product.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
