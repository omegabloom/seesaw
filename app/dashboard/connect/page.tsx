"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Store, ArrowRight, AlertCircle } from "lucide-react";

export default function ConnectStorePage() {
  const [shopDomain, setShopDomain] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate and format shop domain
    let formattedDomain = shopDomain.trim().toLowerCase();

    // Remove protocol if present
    formattedDomain = formattedDomain.replace(/^https?:\/\//, "");

    // Remove trailing slash
    formattedDomain = formattedDomain.replace(/\/$/, "");

    // Add .myshopify.com if not present
    if (!formattedDomain.includes(".myshopify.com")) {
      // Remove any other domain suffix
      formattedDomain = formattedDomain.split(".")[0];
      formattedDomain = `${formattedDomain}.myshopify.com`;
    }

    // Validate format
    const shopRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;
    if (!shopRegex.test(formattedDomain)) {
      setError(
        "Invalid store name. Enter your store name (e.g., 'my-store' or 'my-store.myshopify.com')"
      );
      return;
    }

    setIsLoading(true);

    // Redirect to OAuth flow
    router.push(`/api/auth/shopify?shop=${encodeURIComponent(formattedDomain)}`);
  };

  return (
    <div className="max-w-lg mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Store className="h-6 w-6" />
            <CardTitle>Connect Shopify Store</CardTitle>
          </div>
          <CardDescription>
            Connect your Shopify store to start syncing orders, products,
            customers, and inventory.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shop">Store URL</Label>
              <div className="flex gap-2">
                <Input
                  id="shop"
                  placeholder="your-store"
                  value={shopDomain}
                  onChange={(e) => setShopDomain(e.target.value)}
                  disabled={isLoading}
                />
                <span className="flex items-center text-muted-foreground text-sm">
                  .myshopify.com
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter your Shopify store name or full URL
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                "Redirecting..."
              ) : (
                <>
                  Connect Store
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t">
            <h4 className="font-medium mb-2">What happens next?</h4>
            <ol className="text-sm text-muted-foreground space-y-2">
              <li className="flex gap-2">
                <span className="font-medium">1.</span>
                You'll be redirected to Shopify to authorize access
              </li>
              <li className="flex gap-2">
                <span className="font-medium">2.</span>
                We'll sync your products, orders, customers & inventory (last 90
                days)
              </li>
              <li className="flex gap-2">
                <span className="font-medium">3.</span>
                Real-time updates will start flowing via webhooks
              </li>
            </ol>
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-medium text-sm mb-1">Permissions requested</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Read products and inventory</li>
              <li>• Read orders and transactions</li>
              <li>• Read customer information</li>
              <li>• Read store locations</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
