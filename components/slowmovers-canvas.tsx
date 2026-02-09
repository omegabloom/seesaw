"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useShop } from "@/lib/context/shop-context";
import { X, AlertTriangle, Package, Clock, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  getSlowMoversViewConfig, 
  LimitOption 
} from "@/app/dashboard/settings/page";
import { 
  fetchSlowMovers, 
  computeSlowMoverStats,
  SlowMoverOrder,
  SlowMoversResult,
  AgeTier,
  BlockerType 
} from "@/lib/slowmovers/compute-slowmovers";

// =============================================================================
// Constants
// =============================================================================

const TILE_HEIGHT = 560; // pixels - tall for 2-column layout with large images
const TILES_PER_ROW = 2;
const REFRESH_INTERVAL_MS = 30000; // 30 seconds
const HOVER_RESUME_DELAY_MS = 2000;

// Age tier colors (for left border accent)
const AGE_TIER_COLORS: Record<AgeTier, string> = {
  0: "border-l-emerald-500", // < 24h - green (good)
  1: "border-l-amber-500",   // 24-48h - yellow (warning)
  2: "border-l-orange-500",  // 48-72h - orange (concerning)
  3: "border-l-red-500",     // > 72h - red (critical)
};

const AGE_TIER_TEXT_COLORS: Record<AgeTier, string> = {
  0: "text-emerald-400",
  1: "text-amber-400",
  2: "text-orange-400",
  3: "text-red-400",
};

const BLOCKER_LABELS: Record<NonNullable<BlockerType>, string> = {
  inventory: "Inventory",
  address: "Address",
  payment: "Payment",
  fraud: "Fraud",
  hold: "On Hold",
  unknown: "Unknown",
};

// =============================================================================
// KPI Pill Component
// =============================================================================

function KpiPill({ 
  label, 
  value, 
  icon: Icon,
  highlight = false 
}: { 
  label: string; 
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
}) {
  const iconClass = highlight ? "h-6 w-6 text-red-400" : "h-6 w-6 text-white/50";
  return (
    <div className={cn(
      "flex items-center gap-3 px-5 py-3 rounded-xl",
      highlight ? "bg-red-500/20 border border-red-500/40" : "bg-black border border-white/20"
    )}>
      <Icon className={iconClass} />
      <div className="flex flex-col">
        <span className={cn("text-sm", highlight ? "text-red-300/70" : "text-white/40")}>{label}</span>
        <span className={cn("text-2xl font-bold", highlight ? "text-red-300" : "text-white")}>{value}</span>
      </div>
    </div>
  );
}

// =============================================================================
// Order Tile Component
// =============================================================================

function OrderTile({ 
  order, 
  onHover,
  onHoverEnd 
}: { 
  order: SlowMoverOrder;
  onHover: () => void;
  onHoverEnd: () => void;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const handleMouseEnter = () => {
    setShowTooltip(true);
    onHover();
  };
  
  const handleMouseLeave = () => {
    setShowTooltip(false);
    onHoverEnd();
  };
  
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  return (
    <div 
      className={cn(
        "relative h-full rounded-xl border border-white/10 transition-all duration-200 overflow-hidden",
        "hover:scale-[1.01] cursor-pointer group"
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Product Image Background */}
      {order.productImage && (
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-80 group-hover:opacity-90 transition-opacity"
          style={{ backgroundImage: `url(${order.productImage})` }}
        />
      )}
      
      {/* Gradient overlay - transparent at top, opaque black at bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
      
      {/* Content */}
      <div className="relative z-10 h-full p-5 flex flex-col justify-end">
        {/* Bottom stats - time on left, order number on right */}
        <div className="flex items-end justify-between">
          {/* Time Open - big text on left */}
          <div>
            <div className="text-4xl font-bold text-white">
              {order.ageDisplay}
            </div>
            <div className="text-white/60 text-sm mt-1">
              {order.itemsCount} item{order.itemsCount !== 1 ? 's' : ''} • {formatCurrency(order.orderValue, order.currency)}
            </div>
          </div>
          
          {/* Order Number - right side */}
          <div className="text-right">
            <div className="text-white text-xl font-semibold">
              {order.orderNumber}
            </div>
            {order.destination && (
              <div className="text-white/50 text-sm mt-1">
                {order.destination}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 p-3 bg-gray-900 border border-white/20 rounded-lg shadow-xl min-w-[200px]">
          <div className="text-white font-medium mb-2">{order.orderNumber}</div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-white/50">Age:</span>
              <span className={AGE_TIER_TEXT_COLORS[order.ageTier]}>{order.ageDisplay}</span>
            </div>
            {order.blockerType && (
              <div className="flex justify-between">
                <span className="text-white/50">Blocker:</span>
                <span className="text-amber-400">{BLOCKER_LABELS[order.blockerType]}</span>
              </div>
            )}
            {order.destination && (
              <div className="flex justify-between">
                <span className="text-white/50">Destination:</span>
                <span className="text-white/70">{order.destination}</span>
              </div>
            )}
            {order.shippingMethod && (
              <div className="flex justify-between">
                <span className="text-white/50">Shipping:</span>
                <span className="text-white/70 truncate max-w-[120px]">{order.shippingMethod}</span>
              </div>
            )}
          </div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main SlowMoversCanvas Component
// =============================================================================

interface SlowMoversCanvasProps {
  onClose: () => void;
}

export function SlowMoversCanvas({ onClose }: SlowMoversCanvasProps) {
  const { currentShop } = useShop();
  
  // State
  const [result, setResult] = useState<SlowMoversResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [thresholdDays, setThresholdDays] = useState<number>(2);
  const [limit, setLimit] = useState<LimitOption>(100);
  const [scrollSpeed, setScrollSpeed] = useState(30);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Load config
  useEffect(() => {
    const config = getSlowMoversViewConfig();
    setThresholdDays(config.thresholdDays);
    setLimit(config.limit);
    setScrollSpeed(config.scrollSpeedPxPerSec);
  }, []);
  
  // Fetch data
  const loadData = useCallback(async () => {
    if (!currentShop) return;
    
    try {
      const data = await fetchSlowMovers(currentShop.id, thresholdDays, limit);
      setResult(data);
    } catch (error) {
      console.error("Error loading slow movers:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentShop, thresholdDays, limit]);
  
  // Initial load and refresh
  useEffect(() => {
    loadData();
    
    const interval = setInterval(() => {
      if (!isHovering) {
        loadData();
      }
    }, REFRESH_INTERVAL_MS);
    
    return () => clearInterval(interval);
  }, [loadData, isHovering]);
  
  // Calculate grid dimensions
  const orders = result?.orders || [];
  const rowCount = Math.ceil(orders.length / TILES_PER_ROW);
  const gridHeight = rowCount * TILE_HEIGHT;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight - 200 : 600;
  const maxScrollOffset = Math.max(0, gridHeight - viewportHeight);
  
  // Animation loop
  const animate = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) {
      lastTimeRef.current = timestamp;
    }
    
    const deltaTime = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;
    
    // Skip if paused or hovering
    if (isPaused || isHovering) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }
    
    // Calculate movement
    const pixelsToMove = (scrollSpeed * deltaTime) / 1000;
    
    setScrollOffset(prev => {
      const newOffset = prev + pixelsToMove;
      
      // Reset to top when reaching bottom
      if (newOffset >= maxScrollOffset && maxScrollOffset > 0) {
        return 0;
      }
      
      return newOffset;
    });
    
    animationRef.current = requestAnimationFrame(animate);
  }, [scrollSpeed, maxScrollOffset, isPaused, isHovering]);
  
  // Start animation
  useEffect(() => {
    if (orders.length === 0 || isLoading) return;
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate, orders.length, isLoading]);
  
  // Handle hover
  const handleTileHover = useCallback(() => {
    setIsHovering(true);
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  }, []);
  
  const handleTileHoverEnd = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovering(false);
    }, HOVER_RESUME_DELAY_MS);
  }, []);
  
  // Handle manual scroll with mouse wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScrollOffset(prev => {
      const newOffset = prev + e.deltaY;
      // Clamp between 0 and max
      return Math.max(0, Math.min(newOffset, maxScrollOffset));
    });
  }, [maxScrollOffset]);
  
  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === " ") {
        e.preventDefault();
        setIsPaused(p => !p);
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
  
  // Compute stats
  const stats = result ? computeSlowMoverStats(result.orders) : null;
  
  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-2xl animate-pulse mb-2">Loading Slow Movers...</div>
          <div className="text-white/40 text-sm">Analyzing unfulfilled orders</div>
        </div>
      </div>
    );
  }
  
  // Empty state
  if (orders.length === 0) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 rounded-lg bg-black/30 text-white/50 hover:text-white/80 hover:bg-black/50 transition-all"
          title="Close (Esc)"
        >
          <X className="h-6 w-6" />
        </button>
        
        {/* Status indicator */}
        <div className="absolute top-4 right-16 z-10 flex items-center gap-2 bg-black px-3 py-2 rounded-lg border border-white/20">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-white text-sm font-medium">Slow Movers — &gt; {thresholdDays} day{thresholdDays !== 1 ? 's' : ''}</span>
        </div>
        
        <div className="text-center text-white/60">
          <div className="text-6xl mb-4">🎉</div>
          <p className="text-2xl mb-2">No slow movers right now</p>
          <p className="text-lg">No open orders older than {thresholdDays} day{thresholdDays !== 1 ? 's' : ''}.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div ref={containerRef} className="fixed inset-0 z-[100] bg-black overflow-hidden">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 p-2 rounded-lg bg-black/30 text-white/50 hover:text-white/80 hover:bg-black/50 transition-all"
        title="Close (Esc)"
      >
        <X className="h-6 w-6" />
      </button>
      
      {/* Status indicator */}
      <div className="absolute top-4 right-16 z-30 flex items-center gap-2 bg-black px-3 py-2 rounded-lg border border-white/20">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
        </span>
        <span className="text-white text-sm font-medium">
          Slow Movers — &gt; {thresholdDays} day{thresholdDays !== 1 ? 's' : ''}
        </span>
      </div>
      
      {/* Header - KPI Strip positioned over the grid */}
      <div className="absolute top-4 left-8 z-20 flex items-center gap-3">
        {stats && (
          <>
            <KpiPill 
              label="Count" 
              value={stats.countPastThreshold} 
              icon={Package}
            />
            <KpiPill 
              label="Backlog Value" 
              value={`$${Math.round(stats.backlogValue).toLocaleString()}`} 
              icon={DollarSign}
            />
          </>
        )}
      </div>
      
      {/* Grid Container - starts from top */}
      <div 
        className="absolute left-0 right-0 top-0 bottom-0 overflow-hidden px-8 pt-16"
        onWheel={handleWheel}
        style={{
          maskImage: 'linear-gradient(to bottom, black 90%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 90%, transparent 100%)',
        }}
      >
        <div 
          ref={gridRef}
          className="grid grid-cols-2 gap-4"
          style={{
            transform: `translateY(-${scrollOffset}px)`,
            transition: 'none',
          }}
        >
          {orders.map((order) => (
            <div key={order.orderId} style={{ height: TILE_HEIGHT }}>
              <OrderTile 
                order={order} 
                onHover={handleTileHover}
                onHoverEnd={handleTileHoverEnd}
              />
            </div>
          ))}
        </div>
      </div>
      
      {/* Pause indicator */}
      {(isPaused || isHovering) && (
        <div className="absolute bottom-4 right-4 z-10 px-3 py-1 rounded bg-amber-500/20 border border-amber-500/40">
          <span className="text-sm font-medium text-amber-400">
            {isPaused ? "Paused" : "Hovering"}
          </span>
        </div>
      )}
      
      {/* Keyboard hints */}
      <div className="absolute bottom-4 left-4 z-10 text-white/40 text-xs space-x-4 hidden md:block">
        <span>ESC close</span>
        <span>SPACE pause</span>
      </div>
    </div>
  );
}
