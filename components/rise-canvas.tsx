"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useShop } from "@/lib/context/shop-context";
import { useResourceRealtime } from "@/lib/hooks/use-realtime";
import { createClient } from "@/lib/supabase/client";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import gsap from "gsap";
import { getRiseViewConfig } from "@/app/dashboard/settings/page";

// =============================================================================
// Types
// =============================================================================

interface ProductDemand {
  productId: string;
  productTitle: string;
  image: string | null;
  demandCount: number;
  totalRevenue: number;
  rank: number;
}

interface RiseCanvasProps {
  onClose: () => void;
}

// =============================================================================
// Constants
// =============================================================================

const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%23374151' width='400' height='400'/%3E%3Cpath fill='%236B7280' d='M140 120h120v120H140zM120 280h160v40H120z'/%3E%3C/svg%3E";

const AUTO_SCROLL_INTERVAL = 8000; // ms between auto-scrolls
const SCROLL_DURATION = 800; // ms for scroll animation

// =============================================================================
// Product Card Component (Full Width)
// =============================================================================

function ProductCard({
  product,
  isActive,
  isPulsing,
  ordersAnalyzed,
}: {
  product: ProductDemand;
  isActive: boolean;
  isPulsing: boolean;
  ordersAnalyzed: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isPulsing && cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { boxShadow: "0 0 0px rgba(255,255,255,0)" },
        {
          boxShadow: "0 0 40px rgba(255,255,255,0.4)",
          duration: 0.3,
          yoyo: true,
          repeat: 1,
          ease: "power2.out",
        }
      );
    }
  }, [isPulsing]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div
      ref={cardRef}
      className={`relative w-full h-full transition-all duration-500 ${
        isActive ? "opacity-100 scale-100" : "opacity-40 scale-95"
      }`}
    >
      {/* Product Image */}
      <img
        src={product.image || PLACEHOLDER_IMAGE}
        alt={product.productTitle}
        className="w-full h-full object-cover"
      />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* Bottom Left - Rank & Title */}
      <div className="absolute bottom-8 left-8 z-10">
        {/* Rank Badge */}
        <div className="bg-white text-black font-bold text-5xl px-6 py-3 rounded-xl shadow-lg inline-block mb-4">
          #{product.rank}
        </div>
        {/* Product Title */}
        <h2 className="text-white text-2xl md:text-3xl font-semibold line-clamp-2 max-w-md">
          {product.productTitle}
        </h2>
      </div>

      {/* Bottom Right - Stats */}
      <div className="absolute bottom-8 right-8 z-10 text-right">
        <div className="text-white text-xs uppercase tracking-wider mb-4 underline">
          Last {ordersAnalyzed} Orders
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <div className="text-white/50 text-sm uppercase tracking-wider mb-2">
              Orders
            </div>
            <div className="text-white text-6xl font-light">
              {product.demandCount}
            </div>
          </div>
          <div>
            <div className="text-white/50 text-sm uppercase tracking-wider mb-2">
              Revenue
            </div>
            <div className="text-emerald-400 text-6xl font-light">
              {formatCurrency(product.totalRevenue)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main RiseCanvas Component
// =============================================================================

export function RiseCanvas({ onClose }: RiseCanvasProps) {
  const { currentShop } = useShop();

  // State
  const [ordersToAnalyze, setOrdersToAnalyze] = useState(100);
  const [products, setProducts] = useState<ProductDemand[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [pulsingProducts, setPulsingProducts] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const processedOrdersRef = useRef<Set<string>>(new Set());
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load config on mount
  useEffect(() => {
    const config = getRiseViewConfig();
    setOrdersToAnalyze(config.ordersToAnalyze);
  }, []);

  // Realtime subscription
  const { events: orderEvents } = useResourceRealtime(
    currentShop?.id || null,
    "order"
  );

  // Load orders and compute demand
  const loadDemand = useCallback(async () => {
    if (!currentShop) return;

    setIsLoading(true);
    const supabase = createClient();

    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, line_items, total_price, created_at_shopify")
      .eq("shop_id", currentShop.id)
      .order("created_at_shopify", { ascending: false })
      .limit(ordersToAnalyze);

    if (error) {
      console.error("Error loading orders:", error);
      setIsLoading(false);
      return;
    }

    // Build product demand map
    const demandMap = new Map<
      string,
      { title: string; image: string | null; count: number; revenue: number }
    >();

    (orders || []).forEach((order) => {
      processedOrdersRef.current.add(order.id);

      const lineItems = order.line_items || [];
      lineItems.forEach((item: any) => {
        // Use product_id to group by product (not variant)
        const productId = item.product_id?.toString();
        if (!productId) return; // Skip items without product_id

        const existing = demandMap.get(productId);
        const itemPrice = parseFloat(item.price) || 0;
        const quantity = item.quantity || 1;

        if (existing) {
          existing.count += quantity;
          existing.revenue += itemPrice * quantity;
        } else {
          const image =
            (typeof item.image === "string" ? item.image : null) ||
            item.image?.src ||
            item.product_image ||
            null;

          demandMap.set(productId, {
            title: item.title || item.name || "Unknown Product",
            image,
            count: quantity,
            revenue: itemPrice * quantity,
          });
        }
      });
    });

    // Convert to array, sort by demand, assign ranks
    const sortedProducts: ProductDemand[] = Array.from(demandMap.entries())
      .map(([productId, data]) => ({
        productId,
        productTitle: data.title,
        image: data.image,
        demandCount: data.count,
        totalRevenue: data.revenue,
        rank: 0,
      }))
      .sort((a, b) => b.demandCount - a.demandCount)
      .map((product, index) => ({
        ...product,
        rank: index + 1,
      }));

    console.log("[Rise] Loaded products:", sortedProducts.length);
    setProducts(sortedProducts);
    setCurrentIndex(0);
    setIsLoading(false);
  }, [currentShop, ordersToAnalyze]);

  // Initial load
  useEffect(() => {
    loadDemand();
  }, [loadDemand]);

  // Auto-play scrolling
  useEffect(() => {
    if (!isPlaying || products.length <= 1) return;

    autoPlayTimerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % products.length);
    }, AUTO_SCROLL_INTERVAL);

    return () => {
      if (autoPlayTimerRef.current) {
        clearInterval(autoPlayTimerRef.current);
      }
    };
  }, [isPlaying, products.length]);

  // Scroll to current index (horizontal)
  useEffect(() => {
    if (containerRef.current && products.length > 0) {
      const container = containerRef.current;
      const cardWidth = container.clientWidth;
      const targetScroll = currentIndex * cardWidth;

      gsap.to(container, {
        scrollLeft: targetScroll,
        duration: SCROLL_DURATION / 1000,
        ease: "power2.inOut",
      });
    }
  }, [currentIndex, products.length]);

  // Process realtime order events
  useEffect(() => {
    if (orderEvents.length === 0) return;

    const latestEvent = orderEvents[0];
    if (latestEvent.event_type !== "order_created") return;

    const orderId = latestEvent.resource_id || latestEvent.id;
    if (!orderId || processedOrdersRef.current.has(orderId)) return;
    processedOrdersRef.current.add(orderId);

    const payload = latestEvent.payload;
    const lineItems = payload.line_items || [];

    // Track which products got hit
    const hitProductIds = new Set<string>();

    lineItems.forEach((item: any) => {
      const productId =
        item.product_id?.toString() ||
        item.variant_id?.toString() ||
        item.title ||
        "unknown";
      hitProductIds.add(productId);
    });

    // Trigger pulse animation for hit products
    setPulsingProducts((prev) => {
      const newSet = new Set(prev);
      hitProductIds.forEach((id) => newSet.add(id));
      return newSet;
    });

    // Clear pulse after animation
    setTimeout(() => {
      setPulsingProducts((prev) => {
        const newSet = new Set(prev);
        hitProductIds.forEach((id) => newSet.delete(id));
        return newSet;
      });
    }, 600);
  }, [orderEvents]);

  // Handle manual navigation
  const goToProduct = useCallback((index: number) => {
    setCurrentIndex(index);
    setIsPlaying(false); // Pause auto-play on manual navigation
  }, []);

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        goToProduct((currentIndex - 1 + products.length) % products.length);
      } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        goToProduct((currentIndex + 1) % products.length);
      } else if (e.key === " ") {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, currentIndex, products.length, goToProduct]);

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-hidden">
      {/* Main Content - Horizontal Stack */}
      <div
        ref={containerRef}
        className="h-full w-full overflow-hidden"
        style={{ scrollBehavior: "auto" }}
      >
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-white/40">
            Loading demand data...
          </div>
        ) : products.length === 0 ? (
          <div className="h-full flex items-center justify-center text-white/40">
            No product data in this window
          </div>
        ) : (
          <div className="flex flex-row h-full">
            {products.map((product, index) => (
              <div
                key={product.productId}
                className="h-full w-screen flex-shrink-0"
                onClick={() => goToProduct(index)}
              >
                <ProductCard
                  product={product}
                  isActive={index === currentIndex}
                  isPulsing={pulsingProducts.has(product.productId)}
                  ordersAnalyzed={ordersToAnalyze}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Progress Dots - Bottom Center */}
      {products.length > 0 && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 flex flex-row gap-2">
          {products.slice(0, 10).map((product, index) => (
            <button
              key={product.productId}
              onClick={() => goToProduct(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex
                  ? "bg-white scale-150"
                  : "bg-white/30 hover:bg-white/60"
              }`}
              title={`#${index + 1} ${product.productTitle}`}
            />
          ))}
          {products.length > 10 && (
            <span className="text-white/30 text-[10px] ml-1">+{products.length - 10}</span>
          )}
        </div>
      )}

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 p-2 rounded-lg bg-black/30 text-white/50 hover:text-white/80 hover:bg-black/50 transition-all"
        title="Close (Esc)"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Status indicator - top right */}
      <div className="absolute top-4 right-16 z-10 flex items-center gap-2 bg-black/40 px-3 py-2 rounded-lg">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
        </span>
        <span className="text-white/70 text-sm">
          {isLoading ? 'Loading...' : `Live — last ${ordersToAnalyze} orders`}
        </span>
      </div>
    </div>
  );
}
