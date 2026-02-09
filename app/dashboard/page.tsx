"use client";

import { useShop } from "@/lib/context/shop-context";
import { useViewMode } from "@/lib/context/view-mode-context";
import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowRight, Waves, Globe, TrendingUp, X, Circle, Play, Square, CircleDot, Clock } from "lucide-react";
import Link from "next/link";
import { SalesCanvas } from "@/components/sales-canvas";
import { GlobeCanvas } from "@/components/globe-canvas";
import { RiseCanvas } from "@/components/rise-canvas";
import { BubblesCanvas } from "@/components/bubbles-canvas";
import { SlowMoversCanvas } from "@/components/slowmovers-canvas";
import { getViewLoopConfig, ViewId, ViewLoopConfig } from "./settings/page";

export default function DashboardPage() {
  const { currentShop, shops, isLoading: shopsLoading } = useShop();
  const { setIsViewOpen } = useViewMode();
  const [showStreamCanvas, setShowStreamCanvas] = useState(false);
  const [showGlobeCanvas, setShowGlobeCanvas] = useState(false);
  const [showRiseCanvas, setShowRiseCanvas] = useState(false);
  const [showBubblesCanvas, setShowBubblesCanvas] = useState(false);
  const [showSlowMoversCanvas, setShowSlowMoversCanvas] = useState(false);
  const [showPaleBlueDot, setShowPaleBlueDot] = useState(false);
  
  // Track when any view is open and update context
  const anyViewOpen = showStreamCanvas || showGlobeCanvas || showRiseCanvas || showBubblesCanvas || showSlowMoversCanvas || showPaleBlueDot;
  
  useEffect(() => {
    setIsViewOpen(anyViewOpen);
  }, [anyViewOpen, setIsViewOpen]);
  
  // Loop mode state
  const [isLooping, setIsLooping] = useState(false);
  const [currentLoopView, setCurrentLoopView] = useState<ViewId | null>(null);
  const loopTimerRef = useRef<NodeJS.Timeout | null>(null);
  const loopConfigRef = useRef<ViewLoopConfig | null>(null);
  const escPressedRef = useRef<number>(0);
  const escTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get the list of enabled views in order
  const getEnabledViews = useCallback((): ViewId[] => {
    const config = loopConfigRef.current || getViewLoopConfig();
    return config.order.filter((id) => config.enabled[id]);
  }, []);

  // Show a specific view
  const showView = useCallback((viewId: ViewId) => {
    setShowStreamCanvas(viewId === "stream");
    setShowGlobeCanvas(viewId === "globe");
    setShowRiseCanvas(viewId === "rise");
    setShowBubblesCanvas(viewId === "bubbles");
    setShowSlowMoversCanvas(viewId === "slowmovers");
    setCurrentLoopView(viewId);
  }, []);

  // Hide all views
  const hideAllViews = useCallback(() => {
    setShowStreamCanvas(false);
    setShowGlobeCanvas(false);
    setShowRiseCanvas(false);
    setShowBubblesCanvas(false);
    setShowSlowMoversCanvas(false);
    setCurrentLoopView(null);
  }, []);

  // Advance to next view in loop
  const advanceToNextView = useCallback(() => {
    const enabledViews = getEnabledViews();
    if (enabledViews.length === 0) {
      setIsLooping(false);
      hideAllViews();
      return;
    }

    const currentIndex = currentLoopView ? enabledViews.indexOf(currentLoopView) : -1;
    const nextIndex = (currentIndex + 1) % enabledViews.length;
    const nextView = enabledViews[nextIndex];
    
    showView(nextView);
  }, [currentLoopView, getEnabledViews, showView, hideAllViews]);

  // Start the loop
  const startLoop = useCallback(() => {
    loopConfigRef.current = getViewLoopConfig();
    const enabledViews = getEnabledViews();
    
    if (enabledViews.length === 0) {
      alert("No views are enabled. Please enable at least one view in Settings > Views > All.");
      return;
    }

    setIsLooping(true);
    showView(enabledViews[0]);
  }, [getEnabledViews, showView]);

  // Stop the loop
  const stopLoop = useCallback(() => {
    setIsLooping(false);
    hideAllViews();
    if (loopTimerRef.current) {
      clearTimeout(loopTimerRef.current);
      loopTimerRef.current = null;
    }
  }, [hideAllViews]);

  // Handle view close (from individual canvas close buttons or escape)
  const handleViewClose = useCallback(() => {
    if (isLooping) {
      // Double-tap escape detection for loop mode
      if (escTimeoutRef.current) {
        clearTimeout(escTimeoutRef.current);
      }
      escPressedRef.current++;
      
      if (escPressedRef.current >= 2) {
        // Double-tap: exit loop
        escPressedRef.current = 0;
        stopLoop();
        return;
      }
      
      // Single tap: advance to next view after a delay
      escTimeoutRef.current = setTimeout(() => {
        escPressedRef.current = 0;
        advanceToNextView();
      }, 300);
    } else {
      // Not looping, just close the current view
      hideAllViews();
    }
  }, [isLooping, stopLoop, advanceToNextView, hideAllViews]);

  // Schedule next view transition
  useEffect(() => {
    if (isLooping && currentLoopView) {
      const config = loopConfigRef.current || getViewLoopConfig();
      const durationMs = config.durationMinutes * 60 * 1000;
      
      loopTimerRef.current = setTimeout(() => {
        advanceToNextView();
      }, durationMs);

      return () => {
        if (loopTimerRef.current) {
          clearTimeout(loopTimerRef.current);
        }
      };
    }
  }, [isLooping, currentLoopView, advanceToNextView]);

  // Global escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleViewClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleViewClose]);

  if (shopsLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-white/60 text-lg">Loading...</div>
      </div>
    );
  }

  if (shops.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-6">
        <h2 className="text-3xl font-light text-white">Welcome to Seesaw</h2>
        <p className="text-white/60 text-center max-w-md">
          Connect your first Shopify store to start visualizing your sales in real-time.
        </p>
        <Link
          href="/dashboard/connect"
          className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl transition-colors"
        >
          Connect Shopify Store
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  if (!currentShop) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-white/60 text-lg">Select a store from the dropdown above.</div>
      </div>
    );
  }

  // Main dashboard with view buttons
  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-10 overflow-hidden">
      {/* Loop Control */}
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={isLooping ? stopLoop : startLoop}
          className={`group w-full flex items-center justify-center gap-3 p-4 rounded-2xl border transition-all duration-300 ${
            isLooping
              ? "bg-gradient-to-r from-orange-500/20 to-amber-500/20 border-orange-500/40 hover:border-orange-500/60"
              : "bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-white/10 hover:border-orange-500/40 hover:from-orange-500/20 hover:to-amber-500/20"
          }`}
        >
          {isLooping ? (
            <>
              <Square className="h-5 w-5 text-orange-300 fill-orange-300" />
              <span className="text-lg font-medium text-orange-200">
                Stop Loop
              </span>
              <span className="text-sm text-orange-300/60 ml-2">
                (Press Esc twice to exit)
              </span>
            </>
          ) : (
            <>
              <Play className="h-5 w-5 text-white/70 group-hover:text-orange-300 transition-colors fill-white/70 group-hover:fill-orange-300" />
              <span className="text-lg font-medium text-white/70 group-hover:text-white transition-colors">
                Loop All Views
              </span>
            </>
          )}
        </button>
      </div>

      {/* Five View Buttons - Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full max-w-5xl px-8">
        {/* Stream Button */}
        <button
          onClick={() => setShowStreamCanvas(true)}
          className="group flex flex-col items-center justify-center gap-3 p-8 rounded-2xl bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-white/10 hover:border-orange-500/40 hover:from-orange-500/20 hover:to-amber-500/20 transition-all duration-300"
        >
          <Waves className="h-12 w-12 text-white/70 group-hover:text-orange-300 group-hover:scale-110 transition-all duration-300" />
          <div className="text-center">
            <span className="text-lg font-medium text-white/70 group-hover:text-white transition-colors block">
              Stream
            </span>
            <span className="text-xs text-white/40 group-hover:text-white/60 transition-colors">
              Flowing sales
            </span>
          </div>
        </button>

        {/* Rise Button */}
        <button
          onClick={() => setShowRiseCanvas(true)}
          className="group flex flex-col items-center justify-center gap-3 p-8 rounded-2xl bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-white/10 hover:border-orange-500/40 hover:from-orange-500/20 hover:to-amber-500/20 transition-all duration-300"
        >
          <TrendingUp className="h-12 w-12 text-white/70 group-hover:text-orange-300 group-hover:scale-110 transition-all duration-300" />
          <div className="text-center">
            <span className="text-lg font-medium text-white/70 group-hover:text-white transition-colors block">
              Rise
            </span>
            <span className="text-xs text-white/40 group-hover:text-white/60 transition-colors">
              Top products
            </span>
          </div>
        </button>

        {/* Globe Button */}
        <button
          onClick={() => setShowGlobeCanvas(true)}
          className="group flex flex-col items-center justify-center gap-3 p-8 rounded-2xl bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-white/10 hover:border-orange-500/40 hover:from-orange-500/20 hover:to-amber-500/20 transition-all duration-300"
        >
          <Globe className="h-12 w-12 text-white/70 group-hover:text-orange-300 group-hover:scale-110 transition-all duration-300" />
          <div className="text-center">
            <span className="text-lg font-medium text-white/70 group-hover:text-white transition-colors block">
              Globe
            </span>
            <span className="text-xs text-white/40 group-hover:text-white/60 transition-colors">
              World map
            </span>
          </div>
        </button>

        {/* Bubbles Button */}
        <button
          onClick={() => setShowBubblesCanvas(true)}
          className="group flex flex-col items-center justify-center gap-3 p-8 rounded-2xl bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-white/10 hover:border-orange-500/40 hover:from-orange-500/20 hover:to-amber-500/20 transition-all duration-300"
        >
          <CircleDot className="h-12 w-12 text-white/70 group-hover:text-orange-300 group-hover:scale-110 transition-all duration-300" />
          <div className="text-center">
            <span className="text-lg font-medium text-white/70 group-hover:text-white transition-colors block">
              Bubbles
            </span>
            <span className="text-xs text-white/40 group-hover:text-white/60 transition-colors">
              Bouncing fun
            </span>
          </div>
        </button>

        {/* Slow Movers Button */}
        <button
          onClick={() => setShowSlowMoversCanvas(true)}
          className="group flex flex-col items-center justify-center gap-3 p-8 rounded-2xl bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-white/10 hover:border-orange-500/40 hover:from-orange-500/20 hover:to-amber-500/20 transition-all duration-300"
        >
          <Clock className="h-12 w-12 text-white/70 group-hover:text-orange-300 group-hover:scale-110 transition-all duration-300" />
          <div className="text-center">
            <span className="text-lg font-medium text-white/70 group-hover:text-white transition-colors block">
              Slow Movers
            </span>
            <span className="text-xs text-white/40 group-hover:text-white/60 transition-colors">
              Backlog
            </span>
          </div>
        </button>
      </div>

      {/* Pale Blue Dot Easter Egg */}
      <button
        onClick={() => setShowPaleBlueDot(true)}
        className="absolute bottom-6 right-6 opacity-0 hover:opacity-100 transition-opacity duration-500"
      >
        <Circle className="h-3 w-3 text-blue-400/40" />
      </button>

      {/* Stream Canvas Overlay */}
      {showStreamCanvas && (
        <SalesCanvas onClose={handleViewClose} />
      )}

      {/* Globe Canvas Overlay */}
      {showGlobeCanvas && (
        <GlobeCanvas onClose={handleViewClose} />
      )}

      {/* Rise Canvas Overlay */}
      {showRiseCanvas && (
        <RiseCanvas onClose={handleViewClose} />
      )}

      {/* Bubbles Canvas Overlay */}
      {showBubblesCanvas && (
        <BubblesCanvas onClose={handleViewClose} />
      )}

      {/* Slow Movers Canvas Overlay */}
      {showSlowMoversCanvas && (
        <SlowMoversCanvas onClose={handleViewClose} />
      )}

      {/* Pale Blue Dot Video Modal */}
      {showPaleBlueDot && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={() => setShowPaleBlueDot(false)}
        >
          <button
            onClick={() => setShowPaleBlueDot(false)}
            className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
          >
            <X className="h-8 w-8" />
          </button>
          <div className="max-w-4xl w-full aspect-video">
            <iframe
              width="100%"
              height="100%"
              src="https://www.youtube.com/embed/GO5FwsblpT8?autoplay=1"
              title="Pale Blue Dot"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </div>
  );
}
