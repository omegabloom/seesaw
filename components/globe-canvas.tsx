"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { Canvas, useFrame, useThree, useLoader } from "@react-three/fiber";
import { OrbitControls, Stars, Html, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { useShop } from "@/lib/context/shop-context";
import { useResourceRealtime } from "@/lib/hooks/use-realtime";
import { createClient } from "@/lib/supabase/client";
import { X, Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import gsap from "gsap";
import { getGlobeViewConfig } from "@/app/dashboard/settings/page";

interface OrderLocation {
  id: string;
  latitude: number;
  longitude: number;
  city: string;
  state?: string;
  country: string;
  customerName: string;
  orderName: string;
  totalPrice: number;
  currency: string;
  createdAt: string;
  isNew?: boolean;
}

interface GlobeCanvasProps {
  onClose: () => void;
}

// Convert lat/lng to 3D coordinates on a sphere
function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  
  return new THREE.Vector3(x, y, z);
}

// Format location: city, state for US/Canada or city, country for international
function formatLocation(location: OrderLocation): string {
  const country = location.country?.toLowerCase() || '';
  const isNorthAmerica = 
    country === 'united states' || 
    country === 'usa' || 
    country === 'us' ||
    country === 'canada' ||
    country === 'ca';
  
  if (isNorthAmerica && location.city && location.state) {
    return `${location.city}, ${location.state}`;
  }
  
  // International: show city, country
  if (location.city && location.country) {
    return `${location.city}, ${location.country}`;
  }
  
  return location.city || location.country || 'Unknown';
}

// Arc data type
interface ArcData {
  id: string;
  from: OrderLocation;
  to: OrderLocation;
  progress: number;
  opacity: number;
}

// Animated arc between two locations
function SaleArc({ arc }: { arc: ArcData }) {
  const materialRef = useRef<THREE.LineBasicMaterial>(null);
  
  // Create the arc curve points
  const points = useMemo(() => {
    const start = latLngToVector3(arc.from.latitude, arc.from.longitude, 2.02);
    const end = latLngToVector3(arc.to.latitude, arc.to.longitude, 2.02);
    
    // Calculate midpoint with altitude for arc height
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const distance = start.distanceTo(end);
    const arcHeight = Math.min(distance * 0.5, 1.5);
    mid.normalize().multiplyScalar(2.02 + arcHeight);
    
    // Create quadratic bezier curve
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    return curve.getPoints(50);
  }, [arc.from, arc.to]);

  // Create the line object
  const lineObject = useMemo(() => {
    const visibleCount = Math.max(2, Math.floor(points.length * arc.progress));
    const visiblePoints = points.slice(0, visibleCount);
    
    const geometry = new THREE.BufferGeometry().setFromPoints(visiblePoints);
    const material = new THREE.LineBasicMaterial({ 
      color: 0x22c55e,
      transparent: true,
      opacity: arc.opacity,
    });
    
    return new THREE.Line(geometry, material);
  }, [points, arc.progress, arc.opacity]);

  return <primitive object={lineObject} />;
}

// Order marker component - pin with price display
function OrderMarker({ 
  location, 
  isNew = false,
  onClick 
}: { 
  location: OrderLocation; 
  isNew?: boolean;
  onClick?: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [showPrice, setShowPrice] = useState(isNew);
  const [animationComplete, setAnimationComplete] = useState(!isNew);
  
  const position = useMemo(() => 
    latLngToVector3(location.latitude, location.longitude, 2.02), 
    [location.latitude, location.longitude]
  );

  // GSAP animation for new markers
  useEffect(() => {
    if (isNew && groupRef.current) {
      // Initial state
      gsap.set(groupRef.current.scale, { x: 0, y: 0, z: 0 });
      
      // Animate in with bounce
      gsap.to(groupRef.current.scale, {
        x: 1.5,
        y: 1.5,
        z: 1.5,
        duration: 0.6,
        ease: "back.out(1.7)",
        onComplete: () => {
          // Pulse effect
          gsap.to(groupRef.current!.scale, {
            x: 1,
            y: 1,
            z: 1,
            duration: 0.3,
            ease: "power2.out",
            onComplete: () => setAnimationComplete(true)
          });
        }
      });
      
      // Hide price after delay
      const timer = setTimeout(() => setShowPrice(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [isNew]);

  // Pulse animation for ring
  useFrame((state) => {
    if (ringRef.current && isNew) {
      const pulse = Math.sin(state.clock.elapsedTime * 4) * 0.3 + 1.2;
      ringRef.current.scale.setScalar(pulse);
    }
  });

  const formattedPrice = useMemo(() => 
    new Intl.NumberFormat("en-US", { 
      style: "currency", 
      currency: location.currency,
      maximumFractionDigits: 0 
    }).format(location.totalPrice),
    [location.totalPrice, location.currency]
  );

  return (
    <group ref={groupRef} position={position}>
      {/* Main pin marker */}
      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={onClick}
      >
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial 
          color={isNew ? "#22c55e" : "#f59e0b"} 
          emissive={isNew ? "#22c55e" : "#f59e0b"}
          emissiveIntensity={hovered ? 2.5 : isNew ? 2 : 0.8}
        />
      </mesh>
      
      {/* Pulsing ring for new orders */}
      {isNew && (
        <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.06, 0.08, 32]} />
          <meshBasicMaterial 
            color="#22c55e" 
            transparent 
            opacity={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      
      {/* Price label above marker */}
      {(showPrice || hovered) && (
        <Html distanceFactor={6} center style={{ pointerEvents: 'none' }}>
          <div 
            className={`
              px-3 py-2 rounded-lg text-center whitespace-nowrap shadow-2xl
              transform -translate-y-8 transition-all duration-300
              ${isNew && showPrice 
                ? 'bg-green-500 text-white scale-110' 
                : 'bg-black/90 text-white border border-white/20'
              }
            `}
          >
            <div className="font-bold text-lg">{formattedPrice}</div>
          </div>
        </Html>
      )}
      
      {/* Order info label below marker */}
      {(showPrice || hovered) && (
        <Html distanceFactor={6} center style={{ pointerEvents: 'none' }}>
          <div 
            className="px-2 py-1 rounded text-center whitespace-nowrap transform translate-y-6 bg-black/80 text-white text-xs border border-white/10"
          >
            <div className="font-medium">{location.orderName}</div>
            <div className="text-white/70">{formatLocation(location)}</div>
          </div>
        </Html>
      )}
    </group>
  );
}

// The globe mesh with Earth texture
function Globe({ 
  locations, 
  newLocations, 
  arcs 
}: { 
  locations: OrderLocation[]; 
  newLocations: OrderLocation[];
  arcs: ArcData[];
}) {
  const globeRef = useRef<THREE.Mesh>(null);
  
  // Load Earth textures - using reliable NASA sources
  const [earthMap, earthBump, earthSpec] = useTexture([
    'https://unpkg.com/three-globe@2.31.0/example/img/earth-blue-marble.jpg',
    'https://unpkg.com/three-globe@2.31.0/example/img/earth-topology.png',
    'https://unpkg.com/three-globe@2.31.0/example/img/earth-water.png',
  ]);

  return (
    <group>
      {/* Main globe with Earth texture */}
      <mesh ref={globeRef}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshPhongMaterial 
          map={earthMap}
          bumpMap={earthBump}
          bumpScale={0.05}
          specularMap={earthSpec}
          specular={new THREE.Color(0x333333)}
          shininess={5}
        />
      </mesh>
      
      {/* Atmosphere glow */}
      <mesh scale={[1.02, 1.02, 1.02]}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshBasicMaterial 
          color="#4da6ff" 
          transparent 
          opacity={0.15}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Outer atmosphere */}
      <mesh scale={[1.05, 1.05, 1.05]}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshBasicMaterial 
          color="#87ceeb" 
          transparent 
          opacity={0.05}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Arc connections between orders */}
      {arcs.map((arc) => (
        <SaleArc key={arc.id} arc={arc} />
      ))}

      {/* Order markers */}
      {locations.map((loc) => (
        <OrderMarker key={loc.id} location={loc} />
      ))}
      
      {/* New order markers (highlighted) */}
      {newLocations.map((loc) => (
        <OrderMarker key={`new-${loc.id}`} location={loc} isNew />
      ))}
    </group>
  );
}

// Auto-rotating camera controller with location targeting and zoom
function CameraController({ 
  isPaused, 
  resetTrigger,
  targetLocation 
}: { 
  isPaused: boolean; 
  resetTrigger: number;
  targetLocation: OrderLocation | null;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const isAnimatingRef = useRef(false);
  const lastTargetIdRef = useRef<string | null>(null);
  
  // Smoothly rotate and zoom camera to face a location
  useEffect(() => {
    if (!targetLocation || !controlsRef.current || isAnimatingRef.current) return;
    
    // Skip if same target (prevent re-triggering)
    if (lastTargetIdRef.current === targetLocation.id) return;
    lastTargetIdRef.current = targetLocation.id;
    
    isAnimatingRef.current = true;
    
    // Calculate the position on the globe surface
    const targetPos = latLngToVector3(
      targetLocation.latitude, 
      targetLocation.longitude, 
      2
    );
    
    // Zoom in distance (closer to globe)
    const zoomInDistance = 3.5;
    const zoomOutDistance = 5.5;
    
    // Calculate camera position for zoom-in - closer to the target
    const zoomInTarget = targetPos.clone().normalize().multiplyScalar(zoomInDistance);
    zoomInTarget.y += 0.8; // Less height when zoomed in
    
    // Timeline: pan/zoom in -> hold -> zoom out
    const tl = gsap.timeline({
      onComplete: () => {
        isAnimatingRef.current = false;
      }
    });
    
    // Phase 1: Pan and zoom IN to the location (1.5 seconds)
    tl.to(camera.position, {
      x: zoomInTarget.x,
      y: zoomInTarget.y,
      z: zoomInTarget.z,
      duration: 1.5,
      ease: "power2.inOut",
      onUpdate: () => {
        if (controlsRef.current) {
          controlsRef.current.update();
        }
      },
    });
    
    // Phase 2: Hold at zoomed position (1.5 seconds)
    tl.to({}, { duration: 1.5 });
    
    // Phase 3: Zoom OUT slightly while staying oriented (1 second)
    const zoomOutTarget = targetPos.clone().normalize().multiplyScalar(zoomOutDistance);
    zoomOutTarget.y += 1.5;
    
    tl.to(camera.position, {
      x: zoomOutTarget.x,
      y: zoomOutTarget.y,
      z: zoomOutTarget.z,
      duration: 1,
      ease: "power2.out",
      onUpdate: () => {
        if (controlsRef.current) {
          controlsRef.current.update();
        }
      },
    });
    
  }, [targetLocation, camera]);
  
  useFrame(() => {
    if (controlsRef.current && !isPaused && !isAnimatingRef.current) {
      controlsRef.current.autoRotate = true;
      controlsRef.current.autoRotateSpeed = 0.3;
    } else if (controlsRef.current) {
      controlsRef.current.autoRotate = false;
    }
  });

  useEffect(() => {
    if (controlsRef.current) {
      camera.position.set(0, 2, 5);
      controlsRef.current.reset();
    }
  }, [resetTrigger, camera]);

  return (
    <OrbitControls 
      ref={controlsRef}
      enableZoom={true}
      enablePan={false}
      minDistance={2.8}
      maxDistance={10}
      autoRotate={!isPaused}
      autoRotateSpeed={0.3}
    />
  );
}

// Stats overlay
function StatsOverlay({ 
  totalOrders, 
  totalRevenue, 
  uniqueCountries,
  recentOrder,
  isPlayingBack,
  queueRemaining,
  isLiveMode,
  ordersToShow
}: { 
  totalOrders: number; 
  totalRevenue: number; 
  uniqueCountries: number;
  recentOrder: OrderLocation | null;
  isPlayingBack: boolean;
  queueRemaining: number;
  isLiveMode: boolean;
  ordersToShow: number;
}) {
  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <>
      {/* Bottom Left - Latest Order */}
      {recentOrder && (
        <div className="absolute bottom-8 left-8 z-10">
          <div className="text-white text-xs uppercase tracking-wider mb-4 underline">
            Latest Order
          </div>
          <div className="text-amber-400 text-2xl font-semibold mb-2">
            {recentOrder.orderName}
          </div>
          <div className="text-white/70 text-xl mb-2">
            {formatLocation(recentOrder)}
          </div>
          <div className="text-emerald-400 text-5xl font-light">
            {formatCurrency(recentOrder.totalPrice, recentOrder.currency)}
          </div>
        </div>
      )}

      {/* Bottom Right - Stats */}
      <div className="absolute bottom-8 right-8 z-10 text-right">
        <div className="text-white text-xs uppercase tracking-wider mb-4 underline">
          Last {ordersToShow} Orders
          {isPlayingBack && (
            <span className="ml-2 text-green-400 animate-pulse">
              (Replaying...)
            </span>
          )}
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <div className="text-white/50 text-sm uppercase tracking-wider mb-2">
              Orders
            </div>
            <div className="text-white text-6xl font-light">
              {totalOrders.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-white/50 text-sm uppercase tracking-wider mb-2">
              Revenue
            </div>
            <div className="text-emerald-400 text-6xl font-light">
              {formatCurrency(totalRevenue)}
            </div>
          </div>
          <div>
            <div className="text-white/50 text-sm uppercase tracking-wider mb-2">
              Countries
            </div>
            <div className="text-white text-6xl font-light">
              {uniqueCountries}
            </div>
          </div>
        </div>
        {isPlayingBack && queueRemaining > 0 && (
          <div className="text-white/40 text-sm mt-4">
            {queueRemaining} orders remaining
          </div>
        )}
      </div>

      {/* Live Mode Indicator - Top Right */}
      {isLiveMode && (
        <div className="absolute top-4 right-16 z-10 flex items-center gap-2 bg-black/40 px-3 py-2 rounded-lg">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
          </span>
          <span className="text-white/70 text-sm">Live — last {ordersToShow} orders</span>
        </div>
      )}
    </>
  );
}

export function GlobeCanvas({ onClose }: GlobeCanvasProps) {
  const { currentShop } = useShop();
  const [locations, setLocations] = useState<OrderLocation[]>([]);
  const [newLocations, setNewLocations] = useState<OrderLocation[]>([]);
  const [playbackQueue, setPlaybackQueue] = useState<OrderLocation[]>([]);
  const [arcs, setArcs] = useState<ArcData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [isPlayingBack, setIsPlayingBack] = useState(false);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [lastLocation, setLastLocation] = useState<OrderLocation | null>(null);
  const [ordersToShow, setOrdersToShow] = useState(100);
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const arcAnimationRef = useRef<gsap.core.Tween | null>(null);
  const processedEventsRef = useRef<Set<string>>(new Set());

  // Realtime subscription for new orders
  const { events: orderEvents } = useResourceRealtime(
    currentShop?.id || null,
    "order"
  );

  // Fetch orders with coordinates and set up playback
  useEffect(() => {
    async function fetchOrders() {
      if (!currentShop) return;
      
      const config = getGlobeViewConfig();
      setOrdersToShow(config.ordersToShow);
      setIsLoading(true);
      const supabase = createClient();

      // Get last X orders with coordinates, then reverse for oldest-first playback
      const { data: orders, error } = await supabase
        .from("orders")
        .select("id, name, total_price, currency, shipping_latitude, shipping_longitude, shipping_address, created_at_shopify")
        .eq("shop_id", currentShop.id)
        .not("shipping_latitude", "is", null)
        .not("shipping_longitude", "is", null)
        .order("created_at_shopify", { ascending: false })
        .limit(config.ordersToShow);

      if (error) {
        console.error("Error fetching orders:", error);
        setIsLoading(false);
        return;
      }

      // Reverse to get oldest-first order for playback
      const reversedOrders = (orders || []).reverse();
      
      const orderLocations: OrderLocation[] = reversedOrders.map((order) => ({
        id: order.id,
        latitude: order.shipping_latitude,
        longitude: order.shipping_longitude,
        city: order.shipping_address?.city || "Unknown",
        state: order.shipping_address?.province || order.shipping_address?.province_code || "",
        country: order.shipping_address?.country || order.shipping_address?.country_code || "Unknown",
        customerName: order.shipping_address?.name || "Guest",
        orderName: order.name || "Order",
        totalPrice: parseFloat(order.total_price) || 0,
        currency: order.currency || "USD",
        createdAt: order.created_at_shopify,
      }));

      // Set up playback queue - orders will appear one by one
      setPlaybackQueue(orderLocations);
      setLocations([]);
      setIsLoading(false);
      setIsPlayingBack(true);
    }

    fetchOrders();
  }, [currentShop]);

  // Playback effect - add orders one by one with animation and arcs
  useEffect(() => {
    if (!isPlayingBack || playbackQueue.length === 0 || isPaused) return;

    const playNext = () => {
      const [next, ...rest] = playbackQueue;
      
      // Create arc from last location to this one
      if (lastLocation) {
        const arcId = `arc-${lastLocation.id}-${next.id}`;
        const newArc: ArcData = {
          id: arcId,
          from: lastLocation,
          to: next,
          progress: 0,
          opacity: 1,
        };
        
        setArcs(prev => [...prev, newArc]);
        
        // Animate the arc drawing with GSAP
        const arcProxy = { progress: 0 };
        gsap.to(arcProxy, {
          progress: 1,
          duration: 1.2,
          ease: "power2.out",
          onUpdate: () => {
            setArcs(prev => prev.map(a => 
              a.id === arcId ? { ...a, progress: arcProxy.progress } : a
            ));
          },
          onComplete: () => {
            // Fade out the arc after it's drawn
            gsap.to(arcProxy, {
              progress: 1,
              duration: 2,
              delay: 1,
              onUpdate: () => {
                const fadeProgress = arcProxy.progress;
                setArcs(prev => prev.map(a => 
                  a.id === arcId ? { ...a, opacity: Math.max(0, 1 - fadeProgress * 0.7) } : a
                ));
              },
              onComplete: () => {
                // Remove arc after fade
                setTimeout(() => {
                  setArcs(prev => prev.filter(a => a.id !== arcId));
                }, 3000);
              }
            });
          }
        });
      }
      
      // Add to new locations (animated)
      setNewLocations(prev => [{ ...next, isNew: true }, ...prev.slice(0, 2)]);
      setLastLocation(next);
      setPlaybackQueue(rest);
      
      // After animation, move to regular locations
      setTimeout(() => {
        setNewLocations(prev => prev.filter(l => l.id !== next.id));
        setLocations(prev => [next, ...prev]);
      }, 4000);
    };

    // Play orders with 5 second delay between each (first one starts after 500ms)
    const delay = lastLocation === null ? 500 : 5000;
    playbackTimerRef.current = setTimeout(playNext, delay);
    
    return () => {
      if (playbackTimerRef.current) {
        clearTimeout(playbackTimerRef.current);
      }
    };
  }, [isPlayingBack, playbackQueue, isPaused, lastLocation]);

  // Mark playback complete when queue is empty
  useEffect(() => {
    if (playbackQueue.length === 0 && isPlayingBack) {
      setIsPlayingBack(false);
    }
  }, [playbackQueue.length, isPlayingBack]);

  // Handle new realtime orders
  useEffect(() => {
    if (orderEvents.length === 0) return;
    
    const latestEvent = orderEvents[0];
    if (latestEvent.event_type !== "order_created") return;
    
    // Skip if we've already processed this event
    const eventId: string = latestEvent.id ?? latestEvent.resource_id ?? `temp-${Date.now()}`;
    if (processedEventsRef.current.has(eventId)) return;
    processedEventsRef.current.add(eventId);

    const payload = latestEvent.payload;
    const shippingAddress = payload.shipping_address;
    
    // Check if we have coordinates
    if (!shippingAddress?.latitude || !shippingAddress?.longitude) return;
    
    const newLocation: OrderLocation = {
      id: latestEvent.resource_id || latestEvent.id || eventId,
      latitude: shippingAddress.latitude,
      longitude: shippingAddress.longitude,
      city: shippingAddress.city || "Unknown",
      state: shippingAddress.province || shippingAddress.province_code || "",
      country: shippingAddress.country || shippingAddress.country_code || "Unknown",
      customerName: shippingAddress.name || payload.customer_name || "Guest",
      orderName: payload.name || `#${payload.order_number}`,
      totalPrice: parseFloat(payload.total_price) || 0,
      currency: "USD",
      createdAt: new Date().toISOString(),
      isNew: true,
    };

    // Create arc from last location (if exists)
    if (lastLocation) {
      const arcId = `arc-realtime-${Date.now()}`;
      const newArc: ArcData = {
        id: arcId,
        from: lastLocation,
        to: newLocation,
        progress: 0,
        opacity: 1,
      };
      
      setArcs(prev => [...prev, newArc]);
      
      // Animate the arc
      const arcProxy = { progress: 0, opacity: 1 };
      gsap.to(arcProxy, {
        progress: 1,
        duration: 1.2,
        ease: "power2.out",
        onUpdate: () => {
          setArcs(prev => prev.map(a => 
            a.id === arcId ? { ...a, progress: arcProxy.progress } : a
          ));
        },
        onComplete: () => {
          // Fade out
          gsap.to(arcProxy, {
            opacity: 0,
            duration: 3,
            delay: 2,
            onUpdate: () => {
              setArcs(prev => prev.map(a => 
                a.id === arcId ? { ...a, opacity: arcProxy.opacity } : a
              ));
            },
            onComplete: () => {
              setArcs(prev => prev.filter(a => a.id !== arcId));
            }
          });
        }
      });
    }

    // Add to new locations for highlight effect
    setNewLocations(prev => [newLocation, ...prev.slice(0, 4)]);
    setLastLocation(newLocation);
    
    // After animation, move to regular locations
    setTimeout(() => {
      setNewLocations(prev => prev.filter(l => l.id !== newLocation.id));
      setLocations(prev => [newLocation, ...prev]);
    }, 5000);
  }, [orderEvents]); // Removed lastLocation from dependencies

  // Calculate stats
  const stats = useMemo(() => {
    const allLocations = [...locations, ...newLocations];
    const totalOrders = allLocations.length;
    const totalRevenue = allLocations.reduce((sum, loc) => sum + loc.totalPrice, 0);
    const uniqueCountries = new Set(allLocations.map(loc => loc.country)).size;
    const recentOrder = allLocations[0] || null;
    
    return { totalOrders, totalRevenue, uniqueCountries, recentOrder };
  }, [locations, newLocations]);

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === " ") {
        e.preventDefault();
        setIsPaused(p => !p);
      } else if (e.key === "r") {
        setResetTrigger(t => t + 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <div className="text-white text-2xl animate-pulse">Loading globe...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Three.js Canvas */}
      <Canvas camera={{ position: [0, 2, 5], fov: 45 }}>
        <ambientLight intensity={1.5} />
        <directionalLight position={[5, 3, 5]} intensity={2} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4299e1" />
        
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        <Globe locations={locations} newLocations={newLocations} arcs={arcs} />
        <CameraController 
          isPaused={isPaused} 
          resetTrigger={resetTrigger} 
          targetLocation={newLocations[0] || null}
        />
      </Canvas>

      {/* Stats overlay */}
      <StatsOverlay 
        {...stats} 
        isPlayingBack={isPlayingBack} 
        queueRemaining={playbackQueue.length}
        isLiveMode={!isPlayingBack && playbackQueue.length === 0}
        ordersToShow={ordersToShow}
      />

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 p-2 rounded-lg bg-black/30 text-white/50 hover:text-white/80 hover:bg-black/50 transition-all"
        title="Close (Esc)"
      >
        <X className="h-6 w-6" />
      </button>
    </div>
  );
}
