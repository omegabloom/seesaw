"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useShop } from "@/lib/context/shop-context";
import { X, ChevronUp, ChevronDown, Sparkles, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBillboardViewConfig } from "@/app/dashboard/settings/page";
import { computeBillboardChart, BillboardRow } from "@/lib/billboard/compute-rankings";

// =============================================================================
// Constants
// =============================================================================

const ROW_HEIGHT = 140; // pixels per row
const ZIP_BACK_DURATION_MS = 400;
const PAUSE_AT_TOP_MS = 2000;
const PAUSE_AT_BOTTOM_MS = 1500;

const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect fill='%23374151' width='100' height='100'/%3E%3Cpath fill='%236B7280' d='M30 25h40v40H30zM25 75h50v10H25z'/%3E%3C/svg%3E";

// =============================================================================
// Movement Badge Component
// =============================================================================

function MovementBadge({ 
  movement, 
  isNew, 
  isReentry 
}: { 
  movement: number | null; 
  isNew: boolean; 
  isReentry: boolean;
}) {
  if (isNew) {
    return (
      <div className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500/20 border border-amber-500/40">
        <Sparkles className="h-3.5 w-3.5 text-amber-400" />
        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">New</span>
      </div>
    );
  }
  
  if (isReentry) {
    return (
      <div className="flex items-center gap-1 px-2 py-1 rounded bg-purple-500/20 border border-purple-500/40">
        <RotateCcw className="h-3.5 w-3.5 text-purple-400" />
        <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Re-entry</span>
      </div>
    );
  }
  
  if (movement === null || movement === 0) {
    return (
      <div className="flex items-center gap-1 px-2 py-1 rounded bg-white/5">
        <span className="text-xs font-medium text-white/40">—</span>
      </div>
    );
  }
  
  if (movement > 0) {
    return (
      <div className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/20 border border-emerald-500/40">
        <ChevronUp className="h-4 w-4 text-emerald-400" />
        <span className="text-sm font-bold text-emerald-400">+{movement}</span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-1 px-2 py-1 rounded bg-rose-500/10 border border-rose-500/30">
      <ChevronDown className="h-4 w-4 text-rose-400/70" />
      <span className="text-sm font-bold text-rose-400/70">{movement}</span>
    </div>
  );
}

// =============================================================================
// Image Strip Component
// =============================================================================

function ImageStrip({ images }: { images: string[] }) {
  const displayImages = images.length > 0 ? images.slice(0, 4) : [PLACEHOLDER_IMAGE];
  
  return (
    <div className="flex gap-2">
      {displayImages.map((src, i) => (
        <div
          key={i}
          className={cn(
            "rounded-lg overflow-hidden bg-white/5 flex-shrink-0",
            displayImages.length === 1 ? "w-20 h-20" : "w-16 h-16"
          )}
        >
          <img
            src={src}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
            }}
          />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Billboard Row Component
// =============================================================================

function BillboardRowComponent({ row }: { row: BillboardRow }) {
  return (
    <div 
      className="flex items-center gap-6 px-8 py-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors"
      style={{ height: ROW_HEIGHT }}
    >
      {/* Rank Block */}
      <div className="flex-shrink-0 w-20 text-center">
        <div className="text-5xl font-bold text-white/90 tabular-nums">
          {row.rankThisWeek}
        </div>
      </div>
      
      {/* Movement Indicator */}
      <div className="flex-shrink-0 w-24 flex justify-center">
        <MovementBadge 
          movement={row.movement} 
          isNew={row.isNew} 
          isReentry={row.isReentry} 
        />
      </div>
      
      {/* Product Image Strip */}
      <div className="flex-shrink-0">
        <ImageStrip images={row.images} />
      </div>
      
      {/* Product Info */}
      <div className="flex-1 min-w-0 pr-4">
        <h3 className="text-xl font-semibold text-white truncate">
          {row.title}
        </h3>
        <div className="text-sm text-white/40 mt-1">
          {row.orderAppearances} order{row.orderAppearances !== 1 ? 's' : ''} this week
        </div>
      </div>
      
      {/* History Metadata */}
      <div className="flex-shrink-0 text-right text-sm text-white/30 min-w-[140px]">
        <div className="flex items-center justify-end gap-3">
          <span>LW: {row.rankLastWeek ?? '—'}</span>
          <span>·</span>
          <span>2W: {row.rankTwoWeeksAgo ?? '—'}</span>
          <span>·</span>
          <span>{row.weeksOnChart} wk{row.weeksOnChart !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main BillboardCanvas Component
// =============================================================================

interface BillboardCanvasProps {
  onClose: () => void;
}

export function BillboardCanvas({ onClose }: BillboardCanvasProps) {
  const { currentShop } = useShop();
  
  // State
  const [rows, setRows] = useState<BillboardRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [isZippingBack, setIsZippingBack] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [maxProducts, setMaxProducts] = useState(20);
  const [scrollSpeed, setScrollSpeed] = useState(40);
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const pauseUntilRef = useRef<number>(0);
  
  // Load config
  useEffect(() => {
    const config = getBillboardViewConfig();
    setMaxProducts(config.maxProducts);
    setScrollSpeed(config.scrollSpeedPxPerSec);
  }, []);
  
  // Fetch billboard data
  useEffect(() => {
    async function fetchData() {
      if (!currentShop) return;
      
      setIsLoading(true);
      try {
        const chartData = await computeBillboardChart(currentShop.id, maxProducts);
        setRows(chartData);
      } catch (error) {
        console.error("Error loading billboard data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchData();
  }, [currentShop, maxProducts]);
  
  // Calculate content height
  const contentHeight = rows.length * ROW_HEIGHT;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight - 120 : 800; // Account for header
  const maxScrollOffset = Math.max(0, contentHeight - viewportHeight);
  
  // Animation loop
  const animate = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) {
      lastTimeRef.current = timestamp;
    }
    
    const deltaTime = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;
    
    // Check if we're in a pause period
    if (timestamp < pauseUntilRef.current || isPaused || isZippingBack) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }
    
    // Calculate new offset
    const pixelsToMove = (scrollSpeed * deltaTime) / 1000;
    
    setScrollOffset(prev => {
      const newOffset = prev + pixelsToMove;
      
      // Check if we've reached the bottom
      if (newOffset >= maxScrollOffset && maxScrollOffset > 0) {
        // Pause at bottom
        pauseUntilRef.current = timestamp + PAUSE_AT_BOTTOM_MS;
        
        // Then zip back
        setTimeout(() => {
          setIsZippingBack(true);
          
          // Animate the zip back
          setTimeout(() => {
            setScrollOffset(0);
            setIsZippingBack(false);
            pauseUntilRef.current = performance.now() + PAUSE_AT_TOP_MS;
          }, ZIP_BACK_DURATION_MS);
        }, PAUSE_AT_BOTTOM_MS);
        
        return maxScrollOffset;
      }
      
      return newOffset;
    });
    
    animationRef.current = requestAnimationFrame(animate);
  }, [scrollSpeed, maxScrollOffset, isPaused, isZippingBack]);
  
  // Start animation
  useEffect(() => {
    if (rows.length === 0 || isLoading) return;
    
    // Initial pause at top
    pauseUntilRef.current = performance.now() + PAUSE_AT_TOP_MS;
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate, rows.length, isLoading]);
  
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
  
  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-2xl animate-pulse mb-2">Loading Billboard...</div>
          <div className="text-white/40 text-sm">Computing weekly rankings</div>
        </div>
      </div>
    );
  }
  
  // Empty state
  if (rows.length === 0) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 rounded-lg bg-black/30 text-white/50 hover:text-white/80 hover:bg-black/50 transition-all"
          title="Close (Esc)"
        >
          <X className="h-6 w-6" />
        </button>
        <div className="text-center text-white/60">
          <p className="text-2xl mb-2">No chart data yet</p>
          <p className="text-lg">Orders from the past week will appear here</p>
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

      {/* Status indicator - top right */}
      <div className="absolute top-4 right-16 z-30 flex items-center gap-2 bg-black px-3 py-2 rounded-lg border border-white/20">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>
        <span className="text-white text-sm font-medium">Billboard — top {rows.length} products</span>
      </div>

      {/* Header */}
      <div className="absolute top-16 left-0 right-0 z-20 bg-gradient-to-b from-black via-black/95 to-transparent pb-8 pt-4 px-8">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-white tracking-tight">BILLBOARD</h1>
          <span className="text-lg text-white/40">·</span>
          <span className="text-lg text-white/60">THIS WEEK</span>
        </div>
        <p className="text-sm text-white/30 mt-1">Based on orders · Rolling 7 days</p>
      </div>
      
      {/* Scrolling content */}
      <div 
        className="absolute left-0 right-0 top-[140px]"
        style={{
          transform: `translateY(-${scrollOffset}px)`,
          transition: isZippingBack ? `transform ${ZIP_BACK_DURATION_MS}ms ease-out` : 'none',
        }}
      >
        {rows.map((row) => (
          <BillboardRowComponent key={row.productId} row={row} />
        ))}
      </div>
      
      {/* Bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent pointer-events-none z-10" />
      
      {/* Keyboard hints */}
      <div className="absolute bottom-4 left-4 z-10 text-white/40 text-xs space-x-4 hidden md:block">
        <span>ESC close</span>
        <span>SPACE pause</span>
      </div>
    </div>
  );
}
