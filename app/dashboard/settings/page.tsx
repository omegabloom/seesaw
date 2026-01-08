"use client";

import { useShop } from "@/lib/context/shop-context";
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
import { Button } from "@/components/ui/button";
import { Store, RefreshCw, Check, AlertCircle, Trash2 } from "lucide-react";

interface SyncLog {
  id: string;
  sync_type: string;
  resource_type: string;
  status: string;
  records_synced: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

export default function SettingsPage() {
  const { currentShop, refetchShops } = useShop();
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const fetchSyncLogs = async () => {
    if (!currentShop) return;

    setIsLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("sync_logs")
      .select("*")
      .eq("shop_id", currentShop.id)
      .order("started_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error fetching sync logs:", error);
    } else {
      setSyncLogs(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSyncLogs();
  }, [currentShop]);

  const handleDisconnect = async () => {
    if (!currentShop) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to disconnect "${currentShop.shop_name || currentShop.shop_domain}"? This will remove all synced data for this store.`
    );
    
    if (!confirmed) return;
    
    setIsDisconnecting(true);
    try {
      const supabase = createClient();
      
      // Delete all related data (RLS will handle permissions)
      // The cascade should handle most of this, but we delete explicitly
      await supabase.from("orders").delete().eq("shop_id", currentShop.id);
      await supabase.from("products").delete().eq("shop_id", currentShop.id);
      await supabase.from("customers").delete().eq("shop_id", currentShop.id);
      await supabase.from("inventory_levels").delete().eq("shop_id", currentShop.id);
      await supabase.from("inventory_items").delete().eq("shop_id", currentShop.id);
      await supabase.from("locations").delete().eq("shop_id", currentShop.id);
      await supabase.from("sync_logs").delete().eq("shop_id", currentShop.id);
      await supabase.from("webhook_logs").delete().eq("shop_id", currentShop.id);
      await supabase.from("realtime_events").delete().eq("shop_id", currentShop.id);
      await supabase.from("shop_users").delete().eq("shop_id", currentShop.id);
      
      // Finally delete the shop
      const { error } = await supabase.from("shops").delete().eq("id", currentShop.id);
      
      if (error) throw error;
      
      // Refresh the shop list
      await refetchShops();
      
      // Redirect to dashboard
      window.location.href = "/dashboard";
    } catch (error) {
      console.error("Error disconnecting store:", error);
      alert("Failed to disconnect store. Please try again.");
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (!currentShop) {
    return (
      <div className="text-muted-foreground">
        Select a store to view settings.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your store connection and sync settings
        </p>
      </div>

      {/* Store Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Connected Store
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Store Name
              </label>
              <p className="font-medium">
                {currentShop.shop_name || "Not set"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Domain
              </label>
              <p className="font-medium">{currentShop.shop_domain}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Email
              </label>
              <p className="font-medium">
                {currentShop.shop_email || "Not set"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Currency
              </label>
              <p className="font-medium">{currentShop.currency || "USD"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-4">
            <Badge variant="default" className="flex items-center gap-1">
              <Check className="h-3 w-3" />
              Connected
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Sync History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Sync History</CardTitle>
              <CardDescription>
                Recent data synchronization logs
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={fetchSyncLogs}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading sync logs...
            </div>
          ) : syncLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No sync logs found
            </div>
          ) : (
            <div className="space-y-3">
              {syncLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{log.resource_type}</Badge>
                    <div>
                      <p className="text-sm font-medium">
                        {log.sync_type.charAt(0).toUpperCase() +
                          log.sync_type.slice(1)}{" "}
                        sync
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.started_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {log.status === "completed" ? (
                      <>
                        <span className="text-sm text-muted-foreground">
                          {log.records_synced} records
                        </span>
                        <Badge
                          variant="default"
                          className="flex items-center gap-1"
                        >
                          <Check className="h-3 w-3" />
                          Completed
                        </Badge>
                      </>
                    ) : log.status === "failed" ? (
                      <>
                        <Badge
                          variant="destructive"
                          className="flex items-center gap-1"
                        >
                          <AlertCircle className="h-3 w-3" />
                          Failed
                        </Badge>
                      </>
                    ) : (
                      <Badge variant="secondary">
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        Running
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webhooks Info */}
      <Card>
        <CardHeader>
          <CardTitle>Webhook Configuration</CardTitle>
          <CardDescription>
            Shopify sends real-time updates to your app via webhooks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">orders/*</span>
              <Badge variant="secondary">Active</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">products/*</span>
              <Badge variant="secondary">Active</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">customers/*</span>
              <Badge variant="secondary">Active</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">inventory_levels/*</span>
              <Badge variant="secondary">Active</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">app/uninstalled</span>
              <Badge variant="secondary">Active</Badge>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Note: Webhooks are automatically registered when you connect your
            store. Configure them in your Shopify Partner Dashboard for custom
            topics.
          </p>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions for this store connection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border border-destructive/50 rounded-lg">
            <div>
              <p className="font-medium">Disconnect Store</p>
              <p className="text-sm text-muted-foreground">
                Remove this store and delete all synced data. This action cannot be undone.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Disconnect
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
