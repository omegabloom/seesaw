"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useShop } from "@/lib/context/shop-context";
import { useResourceRealtime } from "@/lib/hooks/use-realtime";
import { createClient } from "@/lib/supabase/client";
import { X, Volume2, VolumeX, Pause, Play, Monitor, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { OrderCelebration } from "./order-celebration";
import { getStreamViewConfig, ImageTransitionMode } from "@/app/dashboard/settings/page";

interface SaleItem {
  id: string;
  name: string;
  total_price: number;
  currency: string;
  customer_name: string;
  location: string;
  line_items: any[];
  created_at: string;
  primary_sku: string | null;
  primary_image: string | null;
  all_images: string[]; // All product images from line items
  item_count: number;
}

interface SalesCanvasProps {
  onClose: () => void;
}

const SCROLL_SPEED = 0.5; // pixels per frame
const USER_SCROLL_TIMEOUT = 5000; // ms before resuming auto-scroll
const PRELOAD_AHEAD = 10; // number of items to preload ahead (increased for smoother loading)
const IMAGE_SLIDE_INTERVAL = 6000; // ms between image slides (increased for slower transitions)
const NEW_ORDER_PAUSE = 8000; // ms to pause on new order before resuming scroll
const SLIDE_DURATION = 3500; // ms for image slide/fade transition (slower for smoother feel)

// Preload an image and return a promise
function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve(); // Resolve even on error to not block
    img.src = src;
  });
}

// Hook to preload images and track loading state
function useImageLoader(images: string[]) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [allLoaded, setAllLoaded] = useState(false);

  useEffect(() => {
    if (images.length === 0) {
      setAllLoaded(true);
      return;
    }

    let mounted = true;
    
    // Preload all images
    Promise.all(images.map(preloadImage)).then(() => {
      if (mounted) {
        setLoadedImages(new Set(images));
        setAllLoaded(true);
      }
    });

    // Also track individual loads for progressive display
    images.forEach(src => {
      const img = new Image();
      img.onload = () => {
        if (mounted) {
          setLoadedImages(prev => new Set([...prev, src]));
        }
      };
      img.src = src;
    });

    return () => { mounted = false; };
  }, [images.join(',')]);

  return { loadedImages, allLoaded, isLoaded: (src: string) => loadedImages.has(src) };
}

// Masonry-style tile layout patterns based on image count
function getTileLayout(count: number): { col: string; row: string; span: string }[] {
  // Returns grid positioning for each image
  if (count === 2) {
    return [
      { col: '1 / 2', row: '1 / 3', span: 'col-span-1 row-span-2' }, // Left half, full height
      { col: '2 / 3', row: '1 / 3', span: 'col-span-1 row-span-2' }, // Right half, full height
    ];
  }
  if (count === 3) {
    return [
      { col: '1 / 2', row: '1 / 3', span: '' }, // Left, full height (big)
      { col: '2 / 3', row: '1 / 2', span: '' }, // Top right (small)
      { col: '2 / 3', row: '2 / 3', span: '' }, // Bottom right (small)
    ];
  }
  if (count === 4) {
    return [
      { col: '1 / 2', row: '1 / 2', span: '' }, // Top left
      { col: '2 / 3', row: '1 / 2', span: '' }, // Top right
      { col: '1 / 2', row: '2 / 3', span: '' }, // Bottom left
      { col: '2 / 3', row: '2 / 3', span: '' }, // Bottom right
    ];
  }
  if (count === 5) {
    return [
      { col: '1 / 2', row: '1 / 3', span: '' }, // Left, full height (big)
      { col: '2 / 3', row: '1 / 2', span: '' }, // Top right
      { col: '3 / 4', row: '1 / 2', span: '' }, // Top far right
      { col: '2 / 3', row: '2 / 3', span: '' }, // Bottom right
      { col: '3 / 4', row: '2 / 3', span: '' }, // Bottom far right
    ];
  }
  // 6+ images - 3x2 grid
  return [
    { col: '1 / 2', row: '1 / 2', span: '' },
    { col: '2 / 3', row: '1 / 2', span: '' },
    { col: '3 / 4', row: '1 / 2', span: '' },
    { col: '1 / 2', row: '2 / 3', span: '' },
    { col: '2 / 3', row: '2 / 3', span: '' },
    { col: '3 / 4', row: '2 / 3', span: '' },
  ];
}

// Single image component with loading state
function LoadableImage({ 
  src, 
  className = "",
  style = {},
  fallbackGradient = "linear-gradient(135deg, hsl(220, 70%, 20%) 0%, hsl(260, 60%, 10%) 100%)"
}: { 
  src: string; 
  className?: string;
  style?: React.CSSProperties;
  fallbackGradient?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className={cn("relative", className)} style={style}>
      {/* Gradient placeholder - always present underneath */}
      <div 
        className="absolute inset-0"
        style={{ 
          background: fallbackGradient,
          opacity: loaded && !error ? 0 : 1,
          transition: 'opacity 0.3s ease-out'
        }}
      />
      {/* Shimmer effect while loading */}
      {!loaded && !error && (
        <div className="absolute inset-0 overflow-hidden">
          <div 
            className="absolute inset-0 -translate-x-full animate-shimmer"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
            }}
          />
        </div>
      )}
      {/* Actual image */}
      {!error && (
        <img
          src={src}
          alt=""
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
            loaded ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      )}
    </div>
  );
}

// Image Display Component for multi-item orders
function ImageDisplay({ 
  images, 
  mode, 
  interval = IMAGE_SLIDE_INTERVAL,
  fallbackGradient = "linear-gradient(135deg, hsl(220, 70%, 20%) 0%, hsl(260, 60%, 10%) 100%)"
}: { 
  images: string[]; 
  mode: ImageTransitionMode;
  interval?: number;
  fallbackGradient?: string;
}) {
  const [displayIndex, setDisplayIndex] = useState(0);
  const [nextDisplayIndex, setNextDisplayIndex] = useState(1);
  const [showNext, setShowNext] = useState(false);

  // Preload all images on mount
  useEffect(() => {
    images.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [images.join(',')]);

  useEffect(() => {
    // Tile mode doesn't need transitions
    if (mode === 'tile' || images.length <= 1) return;
    
    const timer = setInterval(() => {
      // Calculate the next index
      const next = (displayIndex + 1) % images.length;
      setNextDisplayIndex(next);
      
      // Start fading in the next image
      setShowNext(true);
      
      // After transition completes, swap and reset
      setTimeout(() => {
        setDisplayIndex(next);
        setShowNext(false);
      }, SLIDE_DURATION);
    }, interval);
    
    return () => clearInterval(timer);
  }, [images.length, interval, mode, displayIndex]);

  if (images.length === 0) return null;
  
  // Single image - no transitions needed
  if (images.length === 1) {
    return (
      <LoadableImage 
        src={images[0]} 
        className="absolute inset-0 w-full h-full"
        fallbackGradient={fallbackGradient}
      />
    );
  }

  // TILE MODE - masonry layout showing all images
  if (mode === 'tile') {
    const layout = getTileLayout(Math.min(images.length, 6));
    const gridCols = images.length <= 4 ? 'grid-cols-2' : 'grid-cols-3';
    
    return (
      <div className={cn("absolute inset-0 grid grid-rows-2 gap-1", gridCols)}>
        {images.slice(0, 6).map((img, i) => (
          <div
            key={i}
            className="relative overflow-hidden"
            style={{
              gridColumn: layout[i]?.col,
              gridRow: layout[i]?.row,
            }}
          >
            <LoadableImage 
              src={img} 
              className="absolute inset-0 w-full h-full"
              fallbackGradient={fallbackGradient}
            />
            {/* Show +N overlay on last tile if more images */}
            {i === 5 && images.length > 6 && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                <span className="text-white text-4xl font-bold">+{images.length - 6}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // FADE MODE - smooth crossfade between images
  // Layer 1 (bottom): Current displayed image - always visible
  // Layer 2 (top): Next image - fades in, then we swap and reset
  if (mode === 'fade') {
    return (
      <>
        {/* Gradient placeholder behind everything */}
        <div className="absolute inset-0" style={{ background: fallbackGradient }} />
        
        {/* Current image (bottom layer - always visible) */}
        <LoadableImage 
          src={images[displayIndex]} 
          className="absolute inset-0 w-full h-full"
          fallbackGradient={fallbackGradient}
        />
        
        {/* Next image (top layer - fades in) */}
        <div
          style={{ 
            transitionDuration: `${SLIDE_DURATION}ms`,
            transitionTimingFunction: 'ease-in-out',
          }}
          className={cn(
            "absolute inset-0 w-full h-full transition-opacity",
            showNext ? "opacity-100" : "opacity-0"
          )}
        >
          <LoadableImage 
            src={images[nextDisplayIndex]} 
            className="absolute inset-0 w-full h-full"
            fallbackGradient={fallbackGradient}
          />
        </div>
        
        {/* Image indicator dots */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {images.map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-500",
                i === (showNext ? nextDisplayIndex : displayIndex)
                  ? "bg-white w-6" 
                  : "bg-white/40"
              )}
            />
          ))}
        </div>
      </>
    );
  }

  // Default fallback (shouldn't reach here with current types)
  return null;
}

// Celebration data type
interface CelebrationData {
  amount: string;
  orderName: string;
  customerName: string;
}

export function SalesCanvas({ onClose }: SalesCanvasProps) {
  const { currentShop } = useShop();
  const [sales, setSales] = useState<SaleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isCompact, setIsCompact] = useState(false);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 5 });
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);
  const [ordersToShow, setOrdersToShow] = useState(100);
  const [transitionMode, setTransitionMode] = useState<ImageTransitionMode>('fade');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const userScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUserScrollingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastCelebratedOrderRef = useRef<string | null>(null);

  // Realtime subscription for new orders
  const { events: orderEvents } = useResourceRealtime(
    currentShop?.id || null,
    "order"
  );

  // Fetch existing orders
  useEffect(() => {
    async function fetchOrders() {
      if (!currentShop) return;
      const config = getStreamViewConfig();
      setOrdersToShow(config.ordersToShow);
      setTransitionMode(config.transitionMode);
      setIsLoading(true);
      const supabase = createClient();

      const { data: orders, error } = await supabase
        .from("orders")
        .select("*")
        .eq("shop_id", currentShop.id)
        .order("created_at_shopify", { ascending: false })
        .limit(config.ordersToShow);

      if (error) {
        console.error("Error fetching orders:", error);
        setIsLoading(false);
        return;
      }

      const saleItems: SaleItem[] = (orders || []).map((order) => {
        const lineItems = order.line_items || [];
        const firstItem = lineItems[0];
        
        // Try to get customer name from various sources
        const shippingAddress = order.shipping_address || {};
        
        // Collect all images from line items
        const allImages: string[] = lineItems
          .map((item: any) => item.image)
          .filter((img: string | null): img is string => !!img);
        
        // Add primary_image from order if not already in the list
        if (order.primary_image && !allImages.includes(order.primary_image)) {
          allImages.unshift(order.primary_image);
        }
        
        console.log(`[SalesCanvas] Order ${order.name}:`, {
          lineItemCount: lineItems.length,
          imagesFound: allImages.length,
          images: allImages
        });
        
        return {
          id: order.id,
          name: order.name,
          total_price: parseFloat(order.total_price) || 0,
          currency: order.currency || "USD",
          customer_name: shippingAddress.name || order.email || "Guest",
          location: shippingAddress.city && shippingAddress.province_code
            ? `${shippingAddress.city}, ${shippingAddress.province_code}`
            : shippingAddress.country || "",
          line_items: lineItems,
          created_at: order.created_at_shopify,
          primary_sku: firstItem?.sku || null,
          primary_image: allImages[0] || null,
          all_images: allImages,
          item_count: lineItems.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0),
        };
      });

      console.log(`[SalesCanvas] Loaded ${saleItems.length} orders, ${saleItems.filter(s => s.all_images.length > 0).length} with images`);
      setSales(saleItems);
      setIsLoading(false);
    }

    fetchOrders();
  }, [currentShop]);

  // Handle new realtime orders
  useEffect(() => {
    if (orderEvents.length === 0) return;
    
    const latestEvent = orderEvents[0];
    if (latestEvent.event_type !== "order_created") return;

    const payload = latestEvent.payload;
    const lineItems = payload.line_items || [];
    const firstItem = lineItems[0];
    
    // Avoid duplicate celebrations for the same order
    const orderId = latestEvent.resource_id || latestEvent.id;
    if (lastCelebratedOrderRef.current === orderId) return;
    lastCelebratedOrderRef.current = orderId;
    
    // Collect all images from line items
    const allImages: string[] = lineItems
      .map((item: any) => item.image)
      .filter((img: string | null): img is string => !!img);
    
    // Add primary_image from payload if not already in the list
    if (payload.primary_image && !allImages.includes(payload.primary_image)) {
      allImages.unshift(payload.primary_image);
    }

    const newSale: SaleItem = {
      id: orderId,
      name: payload.name || `#${payload.order_number}`,
      total_price: parseFloat(payload.total_price) || 0,
      currency: "USD",
      customer_name: payload.customer_name || payload.customer_email || "Guest",
      location: "", // Could extract from payload if available
      line_items: lineItems,
      created_at: new Date().toISOString(),
      primary_sku: firstItem?.sku || null,
      primary_image: allImages[0] || null,
      all_images: allImages,
      item_count: lineItems.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0),
    };

    // Format price for celebration
    const formattedPrice = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: newSale.currency,
    }).format(newSale.total_price);

    // Trigger celebration animation!
    setCelebration({
      amount: formattedPrice,
      orderName: newSale.name,
      customerName: newSale.customer_name,
    });

    // Add to top of list (will show after celebration)
    setSales((prev) => {
      // Avoid duplicates
      if (prev.some((s) => s.id === newSale.id)) return prev;
      return [newSale, ...prev];
    });

    // Play sound if not muted
    if (!isMuted && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, [orderEvents, isMuted]);

  // Handle celebration complete
  const handleCelebrationComplete = useCallback(() => {
    setCelebration(null);
    
    // Scroll to top to show the new order
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    
    // Pause auto-scroll to let user view the new order
    isUserScrollingRef.current = true;
    if (userScrollTimeoutRef.current) {
      clearTimeout(userScrollTimeoutRef.current);
    }
    userScrollTimeoutRef.current = setTimeout(() => {
      isUserScrollingRef.current = false;
    }, NEW_ORDER_PAUSE);
  }, []);

  // Auto-scroll animation
  const animate = useCallback(() => {
    if (isPaused || isUserScrollingRef.current || celebration || !scrollRef.current) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }

    const container = scrollRef.current;
    const maxScroll = container.scrollHeight - container.clientHeight;
    
    if (container.scrollTop < maxScroll) {
      container.scrollTop += SCROLL_SPEED;
    } else {
      // Loop back to top when reaching bottom
      container.scrollTop = 0;
    }

    animationRef.current = requestAnimationFrame(animate);
  }, [isPaused, celebration]);

  // Start/stop animation
  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate]);

  // Handle user scroll
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;

    // Update visible range for lazy loading
    const container = scrollRef.current;
    const itemHeight = isCompact ? 120 : container.clientHeight;
    const scrollTop = container.scrollTop;
    
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - PRELOAD_AHEAD);
    const visible = Math.ceil(container.clientHeight / itemHeight);
    const end = Math.min(sales.length, start + visible + PRELOAD_AHEAD * 2);
    
    setVisibleRange({ start, end });
  }, [sales.length, isCompact]);

  // Handle user wheel/touch scroll
  const handleUserScroll = useCallback(() => {
    isUserScrollingRef.current = true;
    
    if (userScrollTimeoutRef.current) {
      clearTimeout(userScrollTimeoutRef.current);
    }
    
    userScrollTimeoutRef.current = setTimeout(() => {
      isUserScrollingRef.current = false;
    }, USER_SCROLL_TIMEOUT);
  }, []);

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === " ") {
        e.preventDefault();
        setIsPaused((p) => !p);
      } else if (e.key === "m") {
        setIsMuted((m) => !m);
      } else if (e.key === "c") {
        setIsCompact((c) => !c);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (userScrollTimeoutRef.current) {
        clearTimeout(userScrollTimeoutRef.current);
      }
    };
  }, []);

  // Format currency
  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(price);
  };

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  // Generate fallback gradient background from SKU when no image
  const getFallbackGradient = (sale: SaleItem, index: number) => {
    const seed = sale.primary_sku || sale.name || `sale-${index}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const hue1 = Math.abs(hash % 360);
    const hue2 = (hue1 + 40) % 360;
    
    return `linear-gradient(135deg, hsl(${hue1}, 70%, 20%) 0%, hsl(${hue2}, 60%, 10%) 100%)`;
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
        <div className="text-white text-2xl animate-pulse">Loading sales...</div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="fixed inset-0 z-[100] bg-black">
      {/* Celebration overlay */}
      {celebration && (
        <OrderCelebration
          amount={celebration.amount}
          orderName={celebration.orderName}
          customerName={celebration.customerName}
          onComplete={handleCelebrationComplete}
        />
      )}

      {/* Hidden audio element for notification sound */}
      <audio ref={audioRef} preload="auto">
        <source src="/sounds/cha-ching.mp3" type="audio/mpeg" />
      </audio>

      {/* Close button - standalone for visibility */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 p-2 rounded-lg bg-black/30 text-white/50 hover:text-white/80 hover:bg-black/50 transition-all"
        title="Close (Esc)"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Status indicator - top right */}
      <div className="absolute top-4 right-16 z-50 flex items-center gap-2 bg-black px-3 py-2 rounded-lg border border-white/20">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
        </span>
        <span className="text-white text-sm font-medium">Live — last {ordersToShow} orders</span>
      </div>

      {/* Keyboard hints */}
      <div className="absolute bottom-4 left-4 z-10 text-white/40 text-xs space-x-4 hidden md:block">
        <span>ESC close</span>
        <span>SPACE pause</span>
        <span>M mute</span>
        <span>C compact</span>
      </div>

      {/* Scrolling container */}
      <div
        ref={scrollRef}
        className="h-full overflow-y-auto scrollbar-hide"
        onScroll={handleScroll}
        onWheel={handleUserScroll}
        onTouchMove={handleUserScroll}
      >
        {sales.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-white/60">
              <p className="text-2xl mb-2">No sales yet</p>
              <p className="text-lg">New orders will appear here in real-time</p>
            </div>
          </div>
        ) : isCompact ? (
          // Compact mode - multiple items visible
          <div className="p-4 space-y-2">
            {sales.map((sale, index) => {
              // Lazy load - only render items in visible range
              const isVisible = index >= visibleRange.start && index <= visibleRange.end;
              if (!isVisible) {
                return <div key={sale.id} className="h-[100px]" />;
              }

              return (
                <div
                  key={sale.id}
                  className="flex items-center gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  {/* Product Images - show up to 3 thumbnails */}
                  <div className="flex gap-1 flex-shrink-0">
                    {sale.all_images.length > 0 ? (
                      sale.all_images.slice(0, 3).map((img, i) => (
                        <div
                          key={i}
                          className={cn(
                            "rounded-lg overflow-hidden",
                            sale.all_images.length === 1 ? "w-20 h-20" : "w-14 h-14"
                          )}
                        >
                          <img
                            src={img}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ))
                    ) : (
                      <div
                        className="w-20 h-20 rounded-lg flex items-center justify-center"
                        style={{ background: getFallbackGradient(sale, index) }}
                      >
                        <span className="text-white/90 font-mono text-xs text-center px-1 truncate">
                          {sale.primary_sku || "—"}
                        </span>
                      </div>
                    )}
                    {sale.all_images.length > 3 && (
                      <div className="w-14 h-14 rounded-lg bg-white/10 flex items-center justify-center">
                        <span className="text-white/60 text-xs">+{sale.all_images.length - 3}</span>
                      </div>
                    )}
                  </div>

                  {/* Order info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-white font-bold text-lg">
                        {formatPrice(sale.total_price, sale.currency)}
                      </span>
                      <span className="text-white/50 text-sm">{sale.name}</span>
                    </div>
                    <div className="text-white/70 text-sm truncate">
                      {sale.customer_name}
                      {sale.location && <span className="text-white/40"> • {sale.location}</span>}
                    </div>
                    <div className="text-white/40 text-xs">
                      {sale.item_count} item{sale.item_count !== 1 ? "s" : ""} • {formatTimeAgo(sale.created_at)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // TV Mode - full viewport per sale
          <div>
            {sales.map((sale, index) => {
              // Lazy load - only render content for items in visible range + buffer
              const isVisible = index >= visibleRange.start && index <= visibleRange.end;
              
              // Skip rendering entirely if way outside visible range
              // Keep a larger buffer to avoid content popping
              const shouldRender = index <= visibleRange.end + 2;
              if (!shouldRender) return null;
              
              return (
                <div
                  key={sale.id}
                  className="h-screen w-full relative flex items-center justify-center overflow-hidden"
                  style={{ 
                    background: !isVisible ? getFallbackGradient(sale, index) : undefined 
                  }}
                >
                  {isVisible && (
                    <>
                      {/* Background - Image Display or Gradient Fallback */}
                      {sale.all_images.length > 0 ? (
                        <>
                          {/* Product images with configurable transition mode */}
                          <ImageDisplay 
                            images={sale.all_images} 
                            mode={transitionMode}
                            fallbackGradient={getFallbackGradient(sale, index)}
                          />
                          {/* Subtle gradient - mostly at bottom for text, image stays clean */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
                          {/* Side gradients for corner text */}
                          <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40 z-10" />
                        </>
                      ) : (
                        <>
                          {/* Gradient fallback when no image */}
                          <div 
                            className="absolute inset-0"
                            style={{ background: getFallbackGradient(sale, index) }}
                          />
                          {/* Giant SKU watermark for no-image orders */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-10">
                            <span className="text-white font-mono font-bold text-[20vw] leading-none select-none">
                              {sale.primary_sku || "SKU"}
                            </span>
                          </div>
                        </>
                      )}

                      {/* Order details - bottom left */}
                      <div className="absolute bottom-8 left-8 z-20 text-left max-w-md">
                        {/* Order number & time */}
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-white/80 text-lg font-medium drop-shadow-lg">
                            {sale.name}
                          </span>
                          <span className="text-white/40 text-sm drop-shadow-lg">
                            {formatTimeAgo(sale.created_at)}
                          </span>
                        </div>

                        {/* Customer & Location */}
                        <div className="mb-2">
                          <span className="text-white/90 text-base drop-shadow-lg">
                            {sale.customer_name}
                          </span>
                          {sale.location && (
                            <span className="text-white/50 text-sm ml-2 drop-shadow-lg">
                              📍 {sale.location}
                            </span>
                          )}
                        </div>

                        {/* Items list - compact */}
                        <div className="text-white/60 text-sm drop-shadow-lg">
                          {sale.line_items.slice(0, 3).map((item: any, i: number) => (
                            <span key={i}>
                              {item.title}
                              {item.quantity > 1 && ` ×${item.quantity}`}
                              {i < Math.min(sale.line_items.length, 3) - 1 && " • "}
                            </span>
                          ))}
                          {sale.line_items.length > 3 && (
                            <span className="text-white/40 ml-1">
                              +{sale.line_items.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Price - bottom right */}
                      <div className="absolute bottom-8 right-8 z-20 text-right">
                        <div className="text-white font-bold text-3xl md:text-4xl lg:text-5xl tracking-tight drop-shadow-2xl">
                          {formatPrice(sale.total_price, sale.currency)}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New order flash effect */}
      {orderEvents.length > 0 && orderEvents[0].event_type === "order_created" && (
        <div className="absolute inset-0 pointer-events-none animate-flash bg-white/20 z-50" />
      )}

      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        @keyframes flash {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        .animate-flash {
          animation: flash 0.5s ease-out forwards;
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
