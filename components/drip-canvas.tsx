"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useShop } from "@/lib/context/shop-context";
import { useResourceRealtime } from "@/lib/hooks/use-realtime";
import { createClient } from "@/lib/supabase/client";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import gsap from "gsap";

// =============================================================================
// Types
// =============================================================================

// Represents a single dripping tile (one per line item)
interface DripItem {
  id: string;
  orderId: string;
  image: string | null;
  productTitle: string;
}

// Toast notification for new orders
interface OrderToast {
  id: string;
  orderNumber: string;
  customerName: string;
  totalPrice: number;
  currency: string;
  itemCount: number;
  isNewCustomer: boolean;
}

interface ReservoirTile {
  id: string;
  image: string | null;
  productTitle: string;
  orderNumber: string;
  position: { x: number; y: number };
}

interface KPIStats {
  newCustomers: number;
  repeatCustomers: number;
  totalOrders: number;
  totalRevenue: number;
}

interface DripCanvasProps {
  onClose: () => void;
}

// =============================================================================
// Constants
// =============================================================================

const TILE_SIZE = 32; // px
const TILE_GAP = 4; // px
const RESERVOIR_HEIGHT_PERCENT = 30; // % of viewport
const DRIP_ANIMATION_DURATION = 1.5; // seconds
const REVEAL_HOLD_DURATION = 800; // ms
const REVEAL_FADE_DURATION = 500; // ms
const DRIP_QUEUE_INTERVAL = 1800; // ms between drips
const MAX_QUEUE_SIZE = 30;
const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Crect fill='%23374151' width='64' height='64'/%3E%3Cpath fill='%236B7280' d='M24 20h16v16H24zM20 40h24v4H20z'/%3E%3C/svg%3E";

// =============================================================================
// Customer Classification Hook
// =============================================================================

function useCustomerClassifier(shopId: string | null) {
  const customerMapRef = useRef<Map<string, { firstOrderAt: string; orderCount: number }>>(new Map());
  const [isInitialized, setIsInitialized] = useState(false);

  // Load existing customer order history on mount
  useEffect(() => {
    if (!shopId) {
      setIsInitialized(true);
      return;
    }

    let cancelled = false;

    async function loadCustomerHistory() {
      const supabase = createClient();
      
      // Get all customers with their order counts
      const { data: orders } = await supabase
        .from("orders")
        .select("shopify_customer_id, email, created_at_shopify")
        .eq("shop_id", shopId)
        .order("created_at_shopify", { ascending: true });

      if (cancelled) return;

      if (orders) {
        const map = new Map<string, { firstOrderAt: string; orderCount: number }>();
        
        orders.forEach((order) => {
          const customerId = order.shopify_customer_id?.toString() || order.email || null;
          if (!customerId) return;
          
          const existing = map.get(customerId);
          if (existing) {
            existing.orderCount++;
          } else {
            map.set(customerId, {
              firstOrderAt: order.created_at_shopify,
              orderCount: 1,
            });
          }
        });
        
        customerMapRef.current = map;
      }
      setIsInitialized(true);
    }

    loadCustomerHistory();
    
    return () => {
      cancelled = true;
    };
  }, [shopId]);

  // Use ref-based classification to avoid re-render loops
  const classifyCustomer = useCallback((customerId: string | null, email: string | null): boolean => {
    const identifier = customerId || email;
    if (!identifier) return true; // Unknown = treat as new
    
    const existing = customerMapRef.current.get(identifier);
    if (!existing) {
      // First time seeing this customer - they're new
      customerMapRef.current.set(identifier, { 
        firstOrderAt: new Date().toISOString(), 
        orderCount: 1 
      });
      return true; // New customer
    }
    
    // Existing customer - increment their order count
    existing.orderCount++;
    return false; // Repeat customer
  }, []);

  return { classifyCustomer, isInitialized };
}

// =============================================================================
// KPI Display Component
// =============================================================================

function KPIOverlay({ stats }: { stats: KPIStats }) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="absolute top-0 left-0 right-0 z-20 px-8 py-6">
      <div className="flex justify-center gap-16 max-w-4xl mx-auto">
        <KPIItem label="New Customers" value={stats.newCustomers} />
        <KPIItem label="Repeat Customers" value={stats.repeatCustomers} />
        <KPIItem label="Total Orders" value={stats.totalOrders} />
        <KPIItem label="Total Revenue" value={formatCurrency(stats.totalRevenue)} />
      </div>
    </div>
  );
}

function KPIItem({ label, value }: { label: string; value: string | number }) {
  const prevValueRef = useRef(value);
  const displayRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (displayRef.current && prevValueRef.current !== value) {
      // Subtle scale animation on update
      gsap.fromTo(
        displayRef.current,
        { scale: 1.1, opacity: 0.7 },
        { scale: 1, opacity: 1, duration: 0.4, ease: "power2.out" }
      );
      prevValueRef.current = value;
    }
  }, [value]);

  return (
    <div className="text-center">
      <span
        ref={displayRef}
        className="block text-4xl font-light text-white tracking-tight"
      >
        {value}
      </span>
      <span className="block text-xs text-white/50 uppercase tracking-widest mt-1">
        {label}
      </span>
    </div>
  );
}

// =============================================================================
// Dripping Tile Component
// =============================================================================

function DrippingTile({
  image,
  targetPosition,
  onLanded,
  viewportWidth,
}: {
  image: string | null;
  targetPosition: { x: number; y: number };
  onLanded: () => void;
  viewportWidth: number;
}) {
  const tileRef = useRef<HTMLDivElement>(null);
  const startY = 120; // Start below KPI area
  const startX = (viewportWidth - TILE_SIZE) / 2; // Start from horizontal center

  useEffect(() => {
    if (!tileRef.current) return;

    // Set initial position - center of screen horizontally
    gsap.set(tileRef.current, {
      x: startX,
      y: startY,
      scale: 1,
      opacity: 1,
    });

    // Animate falling from center to target position
    gsap.to(tileRef.current, {
      x: targetPosition.x,
      y: targetPosition.y,
      duration: DRIP_ANIMATION_DURATION,
      ease: "power2.in",
      onComplete: () => {
        // Subtle bounce on landing
        gsap.to(tileRef.current, {
          scale: 1.1,
          duration: 0.1,
          yoyo: true,
          repeat: 1,
          ease: "power2.out",
          onComplete: onLanded,
        });
      },
    });
  }, [targetPosition, onLanded, startX]);

  return (
    <div
      ref={tileRef}
      className="absolute rounded-sm overflow-hidden shadow-lg"
      style={{
        width: TILE_SIZE,
        height: TILE_SIZE,
        willChange: "transform",
      }}
    >
      <img
        src={image || PLACEHOLDER_IMAGE}
        alt=""
        className="w-full h-full object-cover"
        loading="eager"
      />
    </div>
  );
}

// =============================================================================
// Big Reveal Component
// =============================================================================

function BigReveal({
  image,
  onComplete,
}: {
  image: string | null;
  onComplete: () => void;
}) {
  const revealRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!revealRef.current) return;

    const tl = gsap.timeline({ onComplete });

    // Fade in and scale up
    tl.fromTo(
      revealRef.current,
      { scale: 0.96, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.3, ease: "power2.out" }
    );

    // Hold
    tl.to({}, { duration: REVEAL_HOLD_DURATION / 1000 });

    // Fade out
    tl.to(revealRef.current, {
      opacity: 0,
      scale: 1.02,
      duration: REVEAL_FADE_DURATION / 1000,
      ease: "power2.in",
    });

    return () => {
      tl.kill();
    };
  }, [onComplete]);

  return (
    <div
      ref={revealRef}
      className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none"
      style={{ willChange: "transform, opacity" }}
    >
      <div className="w-48 h-48 md:w-64 md:h-64 rounded-lg overflow-hidden shadow-2xl ring-1 ring-white/10">
        <img
          src={image || PLACEHOLDER_IMAGE}
          alt=""
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
}

// =============================================================================
// Order Toast Component
// =============================================================================

function OrderToastNotification({
  toast,
  onComplete,
}: {
  toast: OrderToast;
  onComplete: () => void;
}) {
  const toastRef = useRef<HTMLDivElement>(null);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  useEffect(() => {
    if (!toastRef.current) return;

    const tl = gsap.timeline({ onComplete });

    // Slide in from left
    tl.fromTo(
      toastRef.current,
      { x: -300, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.4, ease: "power2.out" }
    );

    // Hold for 3 seconds
    tl.to({}, { duration: 3 });

    // Fade out
    tl.to(toastRef.current, {
      x: -50,
      opacity: 0,
      duration: 0.3,
      ease: "power2.in",
    });

    return () => {
      tl.kill();
    };
  }, [onComplete]);

  return (
    <div
      ref={toastRef}
      className="absolute top-24 left-6 z-40 pointer-events-none"
      style={{ willChange: "transform, opacity" }}
    >
      <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg px-4 py-3 shadow-xl border border-white/10 min-w-[240px]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-white font-semibold">{toast.orderNumber}</span>
          {toast.isNewCustomer && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 uppercase tracking-wider">
              New
            </span>
          )}
        </div>
        <div className="text-white/70 text-sm">{toast.customerName}</div>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
          <span className="text-white/50 text-xs">
            {toast.itemCount} item{toast.itemCount !== 1 ? "s" : ""}
          </span>
          <span className="text-emerald-400 font-medium">
            {formatCurrency(toast.totalPrice, toast.currency)}
          </span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Reservoir Component
// =============================================================================

function Reservoir({
  tiles,
  reservoirHeight,
  viewportWidth,
}: {
  tiles: ReservoirTile[];
  reservoirHeight: number;
  viewportWidth: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="absolute bottom-0 left-0 right-0 overflow-hidden bg-black/20"
      style={{ height: reservoirHeight }}
    >
      <div className="relative w-full h-full overflow-y-auto">
        {tiles.map((tile) => (
          <div
            key={tile.id}
            className="absolute rounded-sm overflow-hidden transition-opacity duration-1000"
            style={{
              width: TILE_SIZE,
              height: TILE_SIZE,
              left: tile.position.x,
              top: tile.position.y,
            }}
          >
            <img
              src={tile.image || PLACEHOLDER_IMAGE}
              alt={tile.productTitle}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Main DripCanvas Component
// =============================================================================

export function DripCanvas({ onClose }: DripCanvasProps) {
  const { currentShop } = useShop();
  const { classifyCustomer, isInitialized } = useCustomerClassifier(currentShop?.id || null);
  
  // State
  const [stats, setStats] = useState<KPIStats>({
    newCustomers: 0,
    repeatCustomers: 0,
    totalOrders: 0,
    totalRevenue: 0,
  });
  const [reservoirTiles, setReservoirTiles] = useState<ReservoirTile[]>([]);
  const [drippingTile, setDrippingTile] = useState<{
    id: string;
    image: string | null;
    targetPosition: { x: number; y: number };
  } | null>(null);
  const [revealImage, setRevealImage] = useState<string | null>(null);
  const [activeToast, setActiveToast] = useState<OrderToast | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Refs - use DripItem for queue (individual images, not full orders)
  const dripQueueRef = useRef<DripItem[]>([]);
  const toastQueueRef = useRef<OrderToast[]>([]);
  const isProcessingRef = useRef(false);
  const processedOrdersRef = useRef<Set<string>>(new Set());
  const viewportRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
  const tileIndexRef = useRef(0);

  // Realtime subscription
  const { events: orderEvents } = useResourceRealtime(
    currentShop?.id || null,
    "order"
  );

  // Calculate viewport dimensions
  useEffect(() => {
    const updateViewport = () => {
      viewportRef.current = {
        width: window.innerWidth,
        height: window.innerHeight,
      };
    };
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  // Calculate tile position in reservoir grid
  const calculateTilePosition = useCallback((index: number) => {
    const { width, height } = viewportRef.current;
    const reservoirHeight = height * (RESERVOIR_HEIGHT_PERCENT / 100);
    const padding = 16;
    const availableWidth = width - padding * 2;
    const cols = Math.floor(availableWidth / (TILE_SIZE + TILE_GAP));
    
    const col = index % cols;
    const row = Math.floor(index / cols);
    
    const x = padding + col * (TILE_SIZE + TILE_GAP);
    const y = padding + row * (TILE_SIZE + TILE_GAP);
    
    return { x, y };
  }, []);

  // Extract image from a single line item
  const extractImageFromItem = useCallback((item: any): string | null => {
    return (
      (typeof item.image === 'string' ? item.image : null) ||
      item.image?.src ||
      item.product_image ||
      item.variant?.image?.src ||
      (item.images && item.images[0]?.src) ||
      (item.images && typeof item.images[0] === 'string' ? item.images[0] : null) ||
      null
    );
  }, []);

  // Extract ALL product images from order (one per line item)
  const extractAllProductImages = useCallback((lineItems: any[]): Array<{ image: string | null; title: string }> => {
    if (!lineItems || lineItems.length === 0) {
      return [{ image: null, title: "Unknown Product" }];
    }

    const results: Array<{ image: string | null; title: string }> = [];
    
    for (const item of lineItems) {
      const image = extractImageFromItem(item);
      const title = item.title || item.name || "Product";
      // Add one entry per quantity (but cap at 3 per item to avoid spam)
      const qty = Math.min(item.quantity || 1, 3);
      for (let i = 0; i < qty; i++) {
        results.push({ image, title });
      }
    }

    // If we found nothing, return a placeholder
    if (results.length === 0) {
      return [{ image: null, title: "Product" }];
    }

    return results;
  }, [extractImageFromItem]);

  // Track if we've already loaded initial data
  const hasLoadedRef = useRef(false);

  // Load today's orders on mount
  useEffect(() => {
    if (!currentShop || !isInitialized || hasLoadedRef.current) return;
    
    hasLoadedRef.current = true;
    const shopId = currentShop.id;

    async function loadTodaysOrders() {
      setIsLoading(true);
      const supabase = createClient();

      // Get start of today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: orders, error } = await supabase
        .from("orders")
        .select("*")
        .eq("shop_id", shopId)
        .gte("created_at_shopify", today.toISOString())
        .order("created_at_shopify", { ascending: true });

      if (error) {
        console.error("Error loading orders:", error);
        setIsLoading(false);
        return;
      }

      // Process existing orders
      let newCustomers = 0;
      let repeatCustomers = 0;
      let totalRevenue = 0;
      const tiles: ReservoirTile[] = [];
      let tileIdx = 0;

      (orders || []).forEach((order) => {
        const customerId = order.shopify_customer_id?.toString() || null;
        const email = order.email || null;
        const isNew = classifyCustomer(customerId, email);
        
        if (isNew) newCustomers++;
        else repeatCustomers++;
        
        totalRevenue += parseFloat(order.total_price) || 0;
        
        // Extract all images from line items
        const allImages = extractAllProductImages(order.line_items);
        
        // Create a tile for each image
        allImages.forEach((imgData, imgIdx) => {
          const position = calculateTilePosition(tileIdx++);
          tiles.push({
            id: `${order.id}-${imgIdx}`,
            image: imgData.image,
            productTitle: imgData.title,
            orderNumber: order.name || `#${order.order_number}`,
            position,
          });
        });

        processedOrdersRef.current.add(order.id);
      });

      setStats({
        newCustomers,
        repeatCustomers,
        totalOrders: orders?.length || 0,
        totalRevenue,
      });
      setReservoirTiles(tiles);
      tileIndexRef.current = tiles.length;
      setIsLoading(false);
    }

    loadTodaysOrders();
  }, [currentShop, isInitialized, classifyCustomer, extractAllProductImages, calculateTilePosition]);

  // Process incoming realtime orders
  useEffect(() => {
    if (orderEvents.length === 0) return;

    const latestEvent = orderEvents[0];
    if (latestEvent.event_type !== "order_created") return;

    const orderId = latestEvent.resource_id || latestEvent.id;
    if (!orderId || processedOrdersRef.current.has(orderId)) return;
    processedOrdersRef.current.add(orderId);

    const payload = latestEvent.payload;
    const customerId = payload.customer_id?.toString() || payload.shopify_customer_id?.toString() || null;
    const email = payload.customer_email || payload.email || null;
    const isNew = classifyCustomer(customerId, email);

    const lineItems = payload.line_items || [];
    const allImages = extractAllProductImages(lineItems);
    const shippingAddress = payload.shipping_address || {};
    const customerName = shippingAddress.name || payload.customer_name || email?.split('@')[0] || "Customer";
    const orderNumber = payload.name || `#${payload.order_number}`;
    const totalPrice = parseFloat(payload.total_price) || 0;
    const currency = payload.currency || "USD";

    // Update KPIs immediately
    setStats((prev) => ({
      newCustomers: prev.newCustomers + (isNew ? 1 : 0),
      repeatCustomers: prev.repeatCustomers + (isNew ? 0 : 1),
      totalOrders: prev.totalOrders + 1,
      totalRevenue: prev.totalRevenue + totalPrice,
    }));

    // Create toast for this order
    const toast: OrderToast = {
      id: orderId,
      orderNumber,
      customerName,
      totalPrice,
      currency,
      itemCount: lineItems.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0),
      isNewCustomer: isNew,
    };
    toastQueueRef.current.push(toast);

    // Add drip items for each image in the order
    allImages.forEach((imgData, idx) => {
      const dripItem: DripItem = {
        id: `${orderId}-${idx}`,
        orderId: orderId,
        image: imgData.image || payload.primary_image,
        productTitle: imgData.title,
      };

      if (dripQueueRef.current.length < MAX_QUEUE_SIZE) {
        dripQueueRef.current.push(dripItem);
      } else {
        // Queue full - add tile directly without animation
        const position = calculateTilePosition(tileIndexRef.current++);
        setReservoirTiles((prev) => [
          ...prev,
          {
            id: dripItem.id,
            image: dripItem.image,
            productTitle: dripItem.productTitle,
            orderNumber: orderNumber,
            position,
          },
        ]);
      }
    });
  }, [orderEvents, classifyCustomer, extractAllProductImages, calculateTilePosition]);

  // Process drip queue and toast queue
  useEffect(() => {
    const processQueue = () => {
      // Process toast queue (show one at a time if no active toast)
      if (!activeToast && toastQueueRef.current.length > 0) {
        const toast = toastQueueRef.current.shift()!;
        setActiveToast(toast);
      }

      // Process drip queue
      if (isProcessingRef.current || dripQueueRef.current.length === 0) return;

      isProcessingRef.current = true;
      const item = dripQueueRef.current.shift()!;
      const tileIndex = tileIndexRef.current++;
      const position = calculateTilePosition(tileIndex);

      // Start drip animation
      setDrippingTile({
        id: item.id,
        image: item.image,
        targetPosition: {
          x: position.x,
          y: viewportRef.current.height * (1 - RESERVOIR_HEIGHT_PERCENT / 100) + position.y,
        },
      });

      // Set reveal image
      setRevealImage(item.image);
    };

    const interval = setInterval(processQueue, DRIP_QUEUE_INTERVAL);
    processQueue(); // Process immediately on mount

    return () => clearInterval(interval);
  }, [calculateTilePosition, activeToast]);

  // Handle drip landing - use tileIndexRef to get the correct position
  const handleDripLanded = useCallback(() => {
    if (!drippingTile) return;

    // The position was already calculated when we started the drip
    // We need to recalculate based on the current tile count in reservoir
    setReservoirTiles((prev) => {
      const position = calculateTilePosition(prev.length);
      return [
        ...prev,
        {
          id: drippingTile.id,
          image: drippingTile.image,
          productTitle: "",
          orderNumber: "",
          position,
        },
      ];
    });

    setDrippingTile(null);
    isProcessingRef.current = false;
  }, [drippingTile, calculateTilePosition]);

  // Handle toast complete
  const handleToastComplete = useCallback(() => {
    setActiveToast(null);
  }, []);

  // Handle reveal complete
  const handleRevealComplete = useCallback(() => {
    setRevealImage(null);
  }, []);

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Calculate reservoir height
  const reservoirHeight = viewportRef.current.height * (RESERVOIR_HEIGHT_PERCENT / 100);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="text-white/60 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-gray-950 via-gray-900 to-black overflow-hidden">
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-50 text-white/50 hover:text-white hover:bg-white/10"
        onClick={onClose}
      >
        <X className="h-5 w-5" />
      </Button>

      {/* KPI Overlay */}
      <KPIOverlay stats={stats} />

      {/* Order Toast Notification */}
      {activeToast && (
        <OrderToastNotification toast={activeToast} onComplete={handleToastComplete} />
      )}

      {/* Main Stage (empty space for reveal) */}
      <div className="absolute inset-0 pointer-events-none" />

      {/* Big Reveal */}
      {revealImage && (
        <BigReveal image={revealImage} onComplete={handleRevealComplete} />
      )}

      {/* Dripping Tile */}
      {drippingTile && (
        <DrippingTile
          image={drippingTile.image}
          targetPosition={drippingTile.targetPosition}
          onLanded={handleDripLanded}
          viewportWidth={viewportRef.current.width}
        />
      )}

      {/* Reservoir */}
      <Reservoir
        tiles={reservoirTiles}
        reservoirHeight={reservoirHeight}
        viewportWidth={viewportRef.current.width}
      />

      {/* Keyboard hint */}
      <div className="absolute bottom-4 left-4 z-40 text-white/30 text-xs">
        ESC to close
      </div>
    </div>
  );
}
