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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store, RefreshCw, Check, AlertCircle, Trash2, MapPin, Settings2, CreditCard, Eye, GripVertical, Play, Lock } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// =============================================================================
// View Loop Configuration Types & Helpers
// =============================================================================

export type ViewId = "stream" | "rise" | "globe" | "bubbles" | "slowmovers";

export interface ViewLoopConfig {
  order: ViewId[];
  enabled: Record<ViewId, boolean>;
  durationMinutes: number;
}

const DEFAULT_VIEW_LOOP_CONFIG: ViewLoopConfig = {
  order: ["stream", "rise", "globe", "bubbles", "slowmovers"],
  enabled: {
    stream: true,
    rise: true,
    globe: true,
    bubbles: true,
    slowmovers: true,
  },
  durationMinutes: 5,
};

const VIEW_LABELS: Record<ViewId, string> = {
  stream: "Stream",
  rise: "Rise",
  globe: "Globe",
  bubbles: "Bubbles",
  slowmovers: "Slow Movers",
};

const VIEW_DESCRIPTIONS: Record<ViewId, string> = {
  stream: "Flowing sales visualization",
  rise: "Rising product cards",
  globe: "3D world map with orders",
  slowmovers: "Oldest unfulfilled orders",
  bubbles: "Arcade-style bouncing bubbles",
};

export function getViewLoopConfig(): ViewLoopConfig {
  if (typeof window === "undefined") return DEFAULT_VIEW_LOOP_CONFIG;
  try {
    const stored = localStorage.getItem("viewLoopConfig");
    if (stored) {
      const parsed = JSON.parse(stored);
      
      // Get stored order, but ensure all current views are included
      let order = parsed.order || [];
      // Add any new views that aren't in the stored order
      const allViews = DEFAULT_VIEW_LOOP_CONFIG.order;
      for (const view of allViews) {
        if (!order.includes(view)) {
          order.push(view);
        }
      }
      // Remove any views that no longer exist
      order = order.filter((v: ViewId) => allViews.includes(v));
      
      return {
        order,
        enabled: { ...DEFAULT_VIEW_LOOP_CONFIG.enabled, ...parsed.enabled },
        durationMinutes: parsed.durationMinutes || DEFAULT_VIEW_LOOP_CONFIG.durationMinutes,
      };
    }
  } catch (e) {
    console.error("Error reading view loop config:", e);
  }
  return DEFAULT_VIEW_LOOP_CONFIG;
}

export function saveViewLoopConfig(config: ViewLoopConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("viewLoopConfig", JSON.stringify(config));
}

// =============================================================================
// Stream View Configuration
// =============================================================================

export type ImageTransitionMode = 'fade' | 'tile';

export interface StreamViewConfig {
  ordersToShow: number;
  transitionMode: ImageTransitionMode;
}

const DEFAULT_STREAM_CONFIG: StreamViewConfig = {
  ordersToShow: 100,
  transitionMode: 'fade',
};

export function getStreamViewConfig(): StreamViewConfig {
  if (typeof window === "undefined") return DEFAULT_STREAM_CONFIG;
  try {
    const stored = localStorage.getItem("streamViewConfig");
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ordersToShow: parsed.ordersToShow ?? DEFAULT_STREAM_CONFIG.ordersToShow,
        transitionMode: parsed.transitionMode ?? DEFAULT_STREAM_CONFIG.transitionMode,
      };
    }
  } catch (e) {
    console.error("Error reading stream view config:", e);
  }
  return DEFAULT_STREAM_CONFIG;
}

export function saveStreamViewConfig(config: StreamViewConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("streamViewConfig", JSON.stringify(config));
}

// =============================================================================
// Rise View Configuration
// =============================================================================

export interface RiseViewConfig {
  ordersToAnalyze: number;
}

const DEFAULT_RISE_CONFIG: RiseViewConfig = {
  ordersToAnalyze: 100,
};

export function getRiseViewConfig(): RiseViewConfig {
  if (typeof window === "undefined") return DEFAULT_RISE_CONFIG;
  try {
    const stored = localStorage.getItem("riseViewConfig");
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ordersToAnalyze: parsed.ordersToAnalyze ?? DEFAULT_RISE_CONFIG.ordersToAnalyze,
      };
    }
  } catch (e) {
    console.error("Error reading rise view config:", e);
  }
  return DEFAULT_RISE_CONFIG;
}

export function saveRiseViewConfig(config: RiseViewConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("riseViewConfig", JSON.stringify(config));
}

// =============================================================================
// Globe View Configuration
// =============================================================================

export interface GlobeViewConfig {
  ordersToShow: number;
}

const DEFAULT_GLOBE_CONFIG: GlobeViewConfig = {
  ordersToShow: 100,
};

export function getGlobeViewConfig(): GlobeViewConfig {
  if (typeof window === "undefined") return DEFAULT_GLOBE_CONFIG;
  try {
    const stored = localStorage.getItem("globeViewConfig");
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ordersToShow: parsed.ordersToShow ?? DEFAULT_GLOBE_CONFIG.ordersToShow,
      };
    }
  } catch (e) {
    console.error("Error reading globe view config:", e);
  }
  return DEFAULT_GLOBE_CONFIG;
}

export function saveGlobeViewConfig(config: GlobeViewConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("globeViewConfig", JSON.stringify(config));
}

// =============================================================================
// Bubbles View Configuration
// =============================================================================

export interface BubblesViewConfig {
  ordersToReplay: number;
}

const DEFAULT_BUBBLES_CONFIG: BubblesViewConfig = {
  ordersToReplay: 100,
};

export function getBubblesViewConfig(): BubblesViewConfig {
  if (typeof window === "undefined") return DEFAULT_BUBBLES_CONFIG;
  try {
    const stored = localStorage.getItem("bubblesViewConfig");
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ordersToReplay: parsed.ordersToReplay ?? DEFAULT_BUBBLES_CONFIG.ordersToReplay,
      };
    }
  } catch (e) {
    console.error("Error reading bubbles view config:", e);
  }
  return DEFAULT_BUBBLES_CONFIG;
}

export function saveBubblesViewConfig(config: BubblesViewConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("bubblesViewConfig", JSON.stringify(config));
}

// =============================================================================
// Slow Movers View Configuration
// =============================================================================

export type LimitOption = 50 | 100 | 200;

export interface SlowMoversViewConfig {
  thresholdDays: number;
  limit: LimitOption;
  scrollSpeedPxPerSec: number;
}

const DEFAULT_SLOWMOVERS_CONFIG: SlowMoversViewConfig = {
  thresholdDays: 2,
  limit: 100,
  scrollSpeedPxPerSec: 8,
};

export function getSlowMoversViewConfig(): SlowMoversViewConfig {
  if (typeof window === "undefined") return DEFAULT_SLOWMOVERS_CONFIG;
  try {
    const stored = localStorage.getItem("slowMoversViewConfig");
    if (stored) {
      const parsed = JSON.parse(stored);
      // Handle migration from old threshold format
      let thresholdDays = parsed.thresholdDays ?? DEFAULT_SLOWMOVERS_CONFIG.thresholdDays;
      if (parsed.threshold && !parsed.thresholdDays) {
        // Migrate from old format
        if (parsed.threshold === "24h") thresholdDays = 1;
        else if (parsed.threshold === "48h") thresholdDays = 2;
        else if (parsed.threshold === "72h") thresholdDays = 3;
        else if (parsed.threshold === "all") thresholdDays = 0;
      }
      return {
        thresholdDays,
        limit: parsed.limit ?? DEFAULT_SLOWMOVERS_CONFIG.limit,
        scrollSpeedPxPerSec: parsed.scrollSpeedPxPerSec ?? DEFAULT_SLOWMOVERS_CONFIG.scrollSpeedPxPerSec,
      };
    }
  } catch (e) {
    console.error("Error reading slow movers view config:", e);
  }
  return DEFAULT_SLOWMOVERS_CONFIG;
}

export function saveSlowMoversViewConfig(config: SlowMoversViewConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("slowMoversViewConfig", JSON.stringify(config));
}

// =============================================================================
// Sortable View Item Component
// =============================================================================

interface SortableViewItemProps {
  id: ViewId;
  enabled: boolean;
  onToggle: (id: ViewId) => void;
}

function SortableViewItem({ id, enabled, onToggle }: SortableViewItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 bg-background border rounded-lg ${
        isDragging ? "opacity-50 shadow-lg" : ""
      } ${!enabled ? "opacity-60" : ""}`}
    >
      <button
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="flex-1">
        <p className="font-medium">{VIEW_LABELS[id]}</p>
        <p className="text-sm text-muted-foreground">{VIEW_DESCRIPTIONS[id]}</p>
      </div>
      <button
        onClick={() => onToggle(id)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? "bg-gradient-to-r from-orange-500 to-amber-500" : "bg-muted"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

// =============================================================================
// Backfill Coordinates Button
// =============================================================================

function BackfillCoordsButton({ shopId }: { shopId: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ updated: number; total: number } | null>(null);

  const handleBackfill = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      const response = await fetch("/api/backfill-coordinates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId }),
      });
      const data = await response.json();
      if (data.success) {
        setResult({ updated: data.updated, total: data.total });
      } else {
        console.error("Backfill failed:", data.error);
      }
    } catch (error) {
      console.error("Backfill error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="sm"
        onClick={handleBackfill}
        disabled={isLoading}
      >
        <MapPin className="h-4 w-4 mr-2" />
        {isLoading ? "Processing..." : "Backfill Coordinates"}
      </Button>
      {result && (
        <span className="text-sm text-muted-foreground">
          Updated {result.updated} of {result.total} orders
        </span>
      )}
    </div>
  );
}

// =============================================================================
// Main Settings Page
// =============================================================================

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
  const [settingsSection, setSettingsSection] = useState<"views" | "account" | "billing">("views");
  const [viewTab, setViewTab] = useState<"all" | "stream" | "rise" | "globe" | "bubbles" | "slowmovers">("all");
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // View loop configuration state
  const [loopConfig, setLoopConfig] = useState<ViewLoopConfig>(DEFAULT_VIEW_LOOP_CONFIG);
  
  // Individual view configuration states
  const [streamConfig, setStreamConfig] = useState<StreamViewConfig>(DEFAULT_STREAM_CONFIG);
  const [riseConfig, setRiseConfig] = useState<RiseViewConfig>(DEFAULT_RISE_CONFIG);
  const [globeConfig, setGlobeConfig] = useState<GlobeViewConfig>(DEFAULT_GLOBE_CONFIG);
  const [bubblesConfig, setBubblesConfig] = useState<BubblesViewConfig>(DEFAULT_BUBBLES_CONFIG);
  const [slowMoversConfig, setSlowMoversConfig] = useState<SlowMoversViewConfig>(DEFAULT_SLOWMOVERS_CONFIG);
  
  // Load configs from localStorage on mount
  useEffect(() => {
    setLoopConfig(getViewLoopConfig());
    setStreamConfig(getStreamViewConfig());
    setRiseConfig(getRiseViewConfig());
    setGlobeConfig(getGlobeViewConfig());
    setBubblesConfig(getBubblesViewConfig());
    setSlowMoversConfig(getSlowMoversViewConfig());
  }, []);
  
  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = loopConfig.order.indexOf(active.id as ViewId);
      const newIndex = loopConfig.order.indexOf(over.id as ViewId);
      const newOrder = arrayMove(loopConfig.order, oldIndex, newIndex);
      const newConfig = { ...loopConfig, order: newOrder };
      setLoopConfig(newConfig);
      saveViewLoopConfig(newConfig);
    }
  };
  
  const handleToggleView = (id: ViewId) => {
    const newConfig = {
      ...loopConfig,
      enabled: { ...loopConfig.enabled, [id]: !loopConfig.enabled[id] },
    };
    setLoopConfig(newConfig);
    saveViewLoopConfig(newConfig);
  };
  
  const handleDurationChange = (minutes: number) => {
    const newConfig = { ...loopConfig, durationMinutes: Math.max(1, Math.min(60, minutes)) };
    setLoopConfig(newConfig);
    saveViewLoopConfig(newConfig);
  };

  // Stream config handlers
  const handleStreamOrdersChange = (orders: number) => {
    const newConfig = { ...streamConfig, ordersToShow: Math.max(10, Math.min(500, orders)) };
    setStreamConfig(newConfig);
    saveStreamViewConfig(newConfig);
  };

  const handleStreamTransitionModeChange = (mode: ImageTransitionMode) => {
    const newConfig = { ...streamConfig, transitionMode: mode };
    setStreamConfig(newConfig);
    saveStreamViewConfig(newConfig);
  };

  // Rise config handlers
  const handleRiseOrdersChange = (orders: number) => {
    const newConfig = { ...riseConfig, ordersToAnalyze: Math.max(10, Math.min(500, orders)) };
    setRiseConfig(newConfig);
    saveRiseViewConfig(newConfig);
  };

  // Globe config handlers
  const handleGlobeOrdersChange = (orders: number) => {
    const newConfig = { ...globeConfig, ordersToShow: Math.max(10, Math.min(500, orders)) };
    setGlobeConfig(newConfig);
    saveGlobeViewConfig(newConfig);
  };

  // Bubbles config handlers
  const handleBubblesOrdersChange = (orders: number) => {
    const newConfig = { ...bubblesConfig, ordersToReplay: Math.max(10, Math.min(500, orders)) };
    setBubblesConfig(newConfig);
    saveBubblesViewConfig(newConfig);
  };

  // Slow Movers config handlers
  const handleSlowMoversThresholdDaysChange = (days: number) => {
    const newConfig = { ...slowMoversConfig, thresholdDays: Math.max(0, days) };
    setSlowMoversConfig(newConfig);
    saveSlowMoversViewConfig(newConfig);
  };

  const handleSlowMoversLimitChange = (limit: LimitOption) => {
    const newConfig = { ...slowMoversConfig, limit };
    setSlowMoversConfig(newConfig);
    saveSlowMoversViewConfig(newConfig);
  };

  const handleSlowMoversScrollSpeedChange = (speed: number) => {
    const newConfig = { ...slowMoversConfig, scrollSpeedPxPerSec: Math.max(1, Math.min(50, speed)) };
    setSlowMoversConfig(newConfig);
    saveSlowMoversViewConfig(newConfig);
  };

  // Password change handler
  const handleChangePassword = async () => {
    setPasswordError(null);
    setPasswordSuccess(false);
    
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("All fields are required");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return;
    }
    
    setIsChangingPassword(true);
    
    try {
      const supabase = createClient();
      
      // First, verify current password by attempting to sign in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        setPasswordError("Unable to verify user");
        return;
      }
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      
      if (signInError) {
        setPasswordError("Current password is incorrect");
        return;
      }
      
      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      if (updateError) {
        setPasswordError(updateError.message);
        return;
      }
      
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setPasswordError("An unexpected error occurred");
    } finally {
      setIsChangingPassword(false);
    }
  };

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
      
      const { error } = await supabase.from("shops").delete().eq("id", currentShop.id);
      
      if (error) throw error;
      
      await refetchShops();
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
      {/* Header with dropdown */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            {settingsSection === "views" && "Configure visualization settings for each view"}
            {settingsSection === "account" && "Manage your store connection and sync settings"}
            {settingsSection === "billing" && "Manage your subscription and billing"}
          </p>
        </div>
        <Select value={settingsSection} onValueChange={(v: string) => setSettingsSection(v as "views" | "account" | "billing")}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="views">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Views
              </div>
            </SelectItem>
            <SelectItem value="account">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Account
              </div>
            </SelectItem>
            <SelectItem value="billing">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Billing
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Views Section */}
      {settingsSection === "views" && (
        <div className="space-y-6">
          <Tabs value={viewTab} onValueChange={(v: string) => setViewTab(v as "all" | "stream" | "rise" | "globe" | "bubbles" | "slowmovers")} className="w-full">
            <TabsList className="grid w-full max-w-3xl mx-auto grid-cols-6">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="stream">Stream</TabsTrigger>
              <TabsTrigger value="rise">Rise</TabsTrigger>
              <TabsTrigger value="globe">Globe</TabsTrigger>
              <TabsTrigger value="bubbles">Bubbles</TabsTrigger>
              <TabsTrigger value="slowmovers">Slow Movers</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Play className="h-5 w-5" />
                    Loop All Views
                  </CardTitle>
                  <CardDescription>
                    Configure automatic rotation between visualization views
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Duration Setting */}
                  <div className="space-y-2">
                    <Label htmlFor="loop-duration">Duration per view (minutes)</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="loop-duration"
                        type="number"
                        min={1}
                        max={60}
                        value={loopConfig.durationMinutes}
                        onChange={(e) => handleDurationChange(parseInt(e.target.value) || 5)}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">
                        Each view will display for {loopConfig.durationMinutes} minute{loopConfig.durationMinutes !== 1 ? "s" : ""} before advancing
                      </span>
                    </div>
                  </div>

                  {/* View Order */}
                  <div className="space-y-3">
                    <Label>View sequence (drag to reorder)</Label>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={loopConfig.order}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2">
                          {loopConfig.order.map((viewId) => (
                            <SortableViewItem
                              key={viewId}
                              id={viewId}
                              enabled={loopConfig.enabled[viewId]}
                              onToggle={handleToggleView}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>

                  {/* Active views summary */}
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      {loopConfig.order.filter((id) => loopConfig.enabled[id]).length === 0 && (
                        <span className="text-destructive">Enable at least one view to use Loop All.</span>
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stream" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Stream View Settings</CardTitle>
                  <CardDescription>
                    Configure the flowing sales stream visualization
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Orders to Show Setting */}
                  <div className="space-y-2">
                    <Label htmlFor="stream-orders">Number of orders to show</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="stream-orders"
                        type="number"
                        min={10}
                        max={500}
                        value={streamConfig.ordersToShow}
                        onChange={(e) => handleStreamOrdersChange(parseInt(e.target.value) || 100)}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">
                        Display the last {streamConfig.ordersToShow} orders in the stream
                      </span>
                    </div>
                  </div>

                  {/* Transition Mode Setting */}
                  <div className="space-y-3">
                    <Label>Multi-Product Order Display</Label>
                    <div className="grid gap-2">
                      <button
                        onClick={() => handleStreamTransitionModeChange('fade')}
                        className={`w-full p-3 rounded-lg text-left transition-all border ${
                          streamConfig.transitionMode === 'fade'
                            ? 'bg-primary/10 border-primary'
                            : 'bg-muted/50 border-transparent hover:bg-muted'
                        }`}
                      >
                        <div className="font-medium">Fade</div>
                        <div className="text-sm text-muted-foreground">Smooth crossfade between images</div>
                      </button>
                      <button
                        onClick={() => handleStreamTransitionModeChange('tile')}
                        className={`w-full p-3 rounded-lg text-left transition-all border ${
                          streamConfig.transitionMode === 'tile'
                            ? 'bg-primary/10 border-primary'
                            : 'bg-muted/50 border-transparent hover:bg-muted'
                        }`}
                      >
                        <div className="font-medium">Tile / Masonry</div>
                        <div className="text-sm text-muted-foreground">Show all images at once in a grid</div>
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      More stream settings coming soon: animation speed, particle density, and color schemes.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rise" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Rise View Settings</CardTitle>
                  <CardDescription>
                    Configure the rising sales visualization
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Orders to Analyze Setting */}
                  <div className="space-y-2">
                    <Label htmlFor="rise-orders">Number of orders to analyze</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="rise-orders"
                        type="number"
                        min={10}
                        max={500}
                        value={riseConfig.ordersToAnalyze}
                        onChange={(e) => handleRiseOrdersChange(parseInt(e.target.value) || 100)}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">
                        Analyze the last {riseConfig.ordersToAnalyze} orders to determine top products
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      More rise settings coming soon: rise speed, product display options, and timing.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="globe" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Globe View Settings</CardTitle>
                  <CardDescription>
                    Configure the 3D globe order visualization
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Orders to Show Setting */}
                  <div className="space-y-2">
                    <Label htmlFor="globe-orders">Number of orders to show</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="globe-orders"
                        type="number"
                        min={10}
                        max={500}
                        value={globeConfig.ordersToShow}
                        onChange={(e) => handleGlobeOrdersChange(parseInt(e.target.value) || 100)}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">
                        Display the last {globeConfig.ordersToShow} orders on the globe
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      More globe settings coming soon: rotation speed, pin styles, and geographic display options.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bubbles" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Bubbles View Settings</CardTitle>
                  <CardDescription>
                    Configure the arcade-style bouncing bubbles visualization
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Orders to Replay Setting */}
                  <div className="space-y-2">
                    <Label htmlFor="bubbles-orders">Number of orders to replay</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="bubbles-orders"
                        type="number"
                        min={10}
                        max={500}
                        value={bubblesConfig.ordersToReplay}
                        onChange={(e) => handleBubblesOrdersChange(parseInt(e.target.value) || 100)}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">
                        Replay the last {bubblesConfig.ordersToReplay} orders when the view opens
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      More bubble settings coming soon: physics, spawn timing, and background options.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="slowmovers" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Slow Movers View Settings</CardTitle>
                  <CardDescription>
                    Configure the backlog visualization for oldest unfulfilled orders
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Threshold Setting */}
                  <div className="space-y-2">
                    <Label htmlFor="slowmovers-threshold">Minimum age threshold (days)</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="slowmovers-threshold"
                        type="number"
                        min={0}
                        max={365}
                        value={slowMoversConfig.thresholdDays}
                        onChange={(e) => handleSlowMoversThresholdDaysChange(parseInt(e.target.value) || 0)}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">
                        {slowMoversConfig.thresholdDays === 0 
                          ? "Show all unfulfilled orders" 
                          : `Show orders older than ${slowMoversConfig.thresholdDays} day${slowMoversConfig.thresholdDays !== 1 ? 's' : ''}`
                        }
                      </span>
                    </div>
                  </div>

                  {/* Limit Setting */}
                  <div className="space-y-2">
                    <Label>Maximum orders to display</Label>
                    <div className="grid gap-2 grid-cols-3 max-w-xs">
                      {([50, 100, 200] as LimitOption[]).map((limit) => (
                        <button
                          key={limit}
                          onClick={() => handleSlowMoversLimitChange(limit)}
                          className={`p-2 rounded-lg text-center transition-all border ${
                            slowMoversConfig.limit === limit
                              ? 'bg-primary/10 border-primary'
                              : 'bg-muted/50 border-transparent hover:bg-muted'
                          }`}
                        >
                          <div className="font-medium text-sm">{limit}</div>
                        </button>
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Cap the number of orders shown in the grid
                    </p>
                  </div>

                  {/* Scroll Speed Setting */}
                  <div className="space-y-2">
                    <Label htmlFor="slowmovers-speed">Scroll speed (pixels per second)</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="slowmovers-speed"
                        type="number"
                        min={1}
                        max={50}
                        value={slowMoversConfig.scrollSpeedPxPerSec}
                        onChange={(e) => handleSlowMoversScrollSpeedChange(parseInt(e.target.value) || 8)}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">
                        Slower values allow more time to read each tile
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Slow Movers surfaces your oldest unfulfilled orders with age-based color tiers
                      (green &lt; 24h, amber 24-48h, orange 48-72h, red &gt; 72h) and blocker indicators.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Account Section */}
      {settingsSection === "account" && (
        <div className="space-y-6">
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
                    Currency
                  </label>
                  <p className="font-medium">
                    {currentShop.currency}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Status
                  </label>
                  <div className="mt-1">
                    <Badge variant={currentShop.is_active ? "default" : "secondary"}>
                      {currentShop.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </div>
              
              {/* Disconnect */}
              <div className="pt-4 border-t">
                <Button
                  variant="destructive"
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isDisconnecting ? "Disconnecting..." : "Disconnect Store"}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  This will remove all synced data and disconnect your Shopify store.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your account password
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
              
              {passwordError && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4" />
                  {passwordError}
                </div>
              )}
              
              {passwordSuccess && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <Check className="h-4 w-4" />
                  Password changed successfully
                </div>
              )}
              
              <Button
                onClick={handleChangePassword}
                disabled={isChangingPassword}
              >
                {isChangingPassword ? "Changing..." : "Change Password"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Billing Section */}
      {settingsSection === "billing" && (
        <Card>
          <CardHeader>
            <CardTitle>Billing & Subscription</CardTitle>
            <CardDescription>
              Manage your subscription plan and payment methods
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Billing features are provided by the Shopify App Store, please refer to Shopify Admin.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
