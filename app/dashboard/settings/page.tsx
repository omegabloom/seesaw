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
import { Store, RefreshCw, Check, AlertCircle, Trash2, MapPin, Settings2, CreditCard, Eye, GripVertical, Play } from "lucide-react";
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

export type ViewId = "stream" | "rise" | "globe" | "bubbles" | "billboard";

export interface ViewLoopConfig {
  order: ViewId[];
  enabled: Record<ViewId, boolean>;
  durationMinutes: number;
}

const DEFAULT_VIEW_LOOP_CONFIG: ViewLoopConfig = {
  order: ["stream", "rise", "globe", "bubbles", "billboard"],
  enabled: {
    stream: true,
    rise: true,
    globe: true,
    bubbles: true,
    billboard: true,
  },
  durationMinutes: 5,
};

const VIEW_LABELS: Record<ViewId, string> = {
  stream: "Stream",
  rise: "Rise",
  globe: "Globe",
  bubbles: "Bubbles",
  billboard: "Billboard",
};

const VIEW_DESCRIPTIONS: Record<ViewId, string> = {
  stream: "Flowing sales visualization",
  rise: "Rising product cards",
  globe: "3D world map with orders",
  bubbles: "Arcade-style bouncing bubbles",
  billboard: "Weekly product chart rankings",
};

export function getViewLoopConfig(): ViewLoopConfig {
  if (typeof window === "undefined") return DEFAULT_VIEW_LOOP_CONFIG;
  try {
    const stored = localStorage.getItem("viewLoopConfig");
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        order: parsed.order || DEFAULT_VIEW_LOOP_CONFIG.order,
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
// Billboard View Configuration
// =============================================================================

export interface BillboardViewConfig {
  maxProducts: number;
  scrollSpeedPxPerSec: number;
}

const DEFAULT_BILLBOARD_CONFIG: BillboardViewConfig = {
  maxProducts: 20,
  scrollSpeedPxPerSec: 40,
};

export function getBillboardViewConfig(): BillboardViewConfig {
  if (typeof window === "undefined") return DEFAULT_BILLBOARD_CONFIG;
  try {
    const stored = localStorage.getItem("billboardViewConfig");
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        maxProducts: parsed.maxProducts ?? DEFAULT_BILLBOARD_CONFIG.maxProducts,
        scrollSpeedPxPerSec: parsed.scrollSpeedPxPerSec ?? DEFAULT_BILLBOARD_CONFIG.scrollSpeedPxPerSec,
      };
    }
  } catch (e) {
    console.error("Error reading billboard view config:", e);
  }
  return DEFAULT_BILLBOARD_CONFIG;
}

export function saveBillboardViewConfig(config: BillboardViewConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("billboardViewConfig", JSON.stringify(config));
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
          enabled ? "bg-primary" : "bg-muted"
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
  const [viewTab, setViewTab] = useState<"all" | "stream" | "rise" | "globe" | "bubbles" | "billboard">("all");
  
  // View loop configuration state
  const [loopConfig, setLoopConfig] = useState<ViewLoopConfig>(DEFAULT_VIEW_LOOP_CONFIG);
  
  // Individual view configuration states
  const [streamConfig, setStreamConfig] = useState<StreamViewConfig>(DEFAULT_STREAM_CONFIG);
  const [riseConfig, setRiseConfig] = useState<RiseViewConfig>(DEFAULT_RISE_CONFIG);
  const [globeConfig, setGlobeConfig] = useState<GlobeViewConfig>(DEFAULT_GLOBE_CONFIG);
  const [bubblesConfig, setBubblesConfig] = useState<BubblesViewConfig>(DEFAULT_BUBBLES_CONFIG);
  const [billboardConfig, setBillboardConfig] = useState<BillboardViewConfig>(DEFAULT_BILLBOARD_CONFIG);
  
  // Load configs from localStorage on mount
  useEffect(() => {
    setLoopConfig(getViewLoopConfig());
    setStreamConfig(getStreamViewConfig());
    setRiseConfig(getRiseViewConfig());
    setGlobeConfig(getGlobeViewConfig());
    setBubblesConfig(getBubblesViewConfig());
    setBillboardConfig(getBillboardViewConfig());
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

  // Billboard config handlers
  const handleBillboardMaxProductsChange = (max: number) => {
    const newConfig = { ...billboardConfig, maxProducts: Math.max(5, Math.min(50, max)) };
    setBillboardConfig(newConfig);
    saveBillboardViewConfig(newConfig);
  };

  const handleBillboardScrollSpeedChange = (speed: number) => {
    const newConfig = { ...billboardConfig, scrollSpeedPxPerSec: Math.max(10, Math.min(100, speed)) };
    setBillboardConfig(newConfig);
    saveBillboardViewConfig(newConfig);
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
          <Tabs value={viewTab} onValueChange={(v: string) => setViewTab(v as "all" | "stream" | "rise" | "globe" | "bubbles" | "billboard")} className="w-full">
            <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-6">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="stream">Stream</TabsTrigger>
              <TabsTrigger value="rise">Rise</TabsTrigger>
              <TabsTrigger value="globe">Globe</TabsTrigger>
              <TabsTrigger value="bubbles">Bubbles</TabsTrigger>
              <TabsTrigger value="billboard">Billboard</TabsTrigger>
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
                      {loopConfig.order.filter((id) => loopConfig.enabled[id]).length} of 5 views enabled.
                      {loopConfig.order.filter((id) => loopConfig.enabled[id]).length === 0 && (
                        <span className="text-destructive ml-1">Enable at least one view to use Loop All.</span>
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

            <TabsContent value="billboard" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Billboard View Settings</CardTitle>
                  <CardDescription>
                    Configure the weekly product chart rankings visualization
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Max Products Setting */}
                  <div className="space-y-2">
                    <Label htmlFor="billboard-max">Maximum products to show</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="billboard-max"
                        type="number"
                        min={5}
                        max={50}
                        value={billboardConfig.maxProducts}
                        onChange={(e) => handleBillboardMaxProductsChange(parseInt(e.target.value) || 20)}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">
                        Display the top {billboardConfig.maxProducts} products on the chart
                      </span>
                    </div>
                  </div>

                  {/* Scroll Speed Setting */}
                  <div className="space-y-2">
                    <Label htmlFor="billboard-speed">Scroll speed (pixels per second)</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        id="billboard-speed"
                        type="number"
                        min={10}
                        max={100}
                        value={billboardConfig.scrollSpeedPxPerSec}
                        onChange={(e) => handleBillboardScrollSpeedChange(parseInt(e.target.value) || 40)}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">
                        Slower values allow more time to read each row
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Billboard ranks products by order appearances over rolling weekly windows.
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
                  <Badge variant={currentShop.is_active ? "default" : "secondary"}>
                    {currentShop.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
              
              {/* Backfill Coordinates */}
              <div className="pt-4 border-t">
                <label className="text-sm font-medium text-muted-foreground block mb-2">
                  Globe View Data
                </label>
                <BackfillCoordsButton shopId={currentShop.id} />
                <p className="text-xs text-muted-foreground mt-2">
                  Backfill geographic coordinates for orders missing location data (required for Globe view).
                </p>
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

          {/* Sync History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Sync History</span>
                <Button variant="outline" size="sm" onClick={fetchSyncLogs}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center text-muted-foreground py-4">
                  Loading sync history...
                </div>
              ) : syncLogs.length === 0 ? (
                <div className="text-center text-muted-foreground py-4">
                  No sync history yet
                </div>
              ) : (
                <div className="space-y-2">
                  {syncLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {log.status === "completed" ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : log.status === "failed" ? (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        )}
                        <div>
                          <p className="font-medium capitalize">
                            {log.resource_type} {log.sync_type}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(log.started_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={
                            log.status === "completed"
                              ? "default"
                              : log.status === "failed"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {log.status}
                        </Badge>
                        {log.records_synced > 0 && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {log.records_synced} records
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
              Billing features coming soon. You&apos;re currently on the free tier.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
