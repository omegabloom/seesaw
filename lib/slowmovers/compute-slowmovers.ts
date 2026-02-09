/**
 * Slow Movers Computation
 * 
 * Fetches and processes oldest unfulfilled orders,
 * computing age, blockers, and SLA tiers.
 */

import { createClient } from "@/lib/supabase/client";
import { LimitOption } from "@/app/dashboard/settings/page";

// =============================================================================
// Types
// =============================================================================

export type BlockerType = "inventory" | "address" | "payment" | "fraud" | "hold" | "unknown" | null;

export type AgeTier = 0 | 1 | 2 | 3;
// Tier 0: < 24h
// Tier 1: 24-48h
// Tier 2: 48-72h
// Tier 3: > 72h

export interface SlowMoverOrder {
  orderId: string;
  shopifyOrderId: number;
  orderNumber: string;
  createdAt: string;
  ageSeconds: number;
  ageDisplay: string;
  financialStatus: string | null;
  fulfillmentStatus: string | null;
  isOpen: boolean;
  blockerType: BlockerType;
  destination: string | null;
  itemsCount: number;
  orderValue: number;
  currency: string;
  shippingMethod: string | null;
  ageTier: AgeTier;
  productImage: string | null;
}

export interface SlowMoversResult {
  orders: SlowMoverOrder[];
  totalMatchingCount: number;
  isFallback: boolean;
  fallbackMessage: string | null;
}

// =============================================================================
// Age Utilities
// =============================================================================

const HOUR_SECONDS = 3600;
const DAY_SECONDS = 86400;

/**
 * Calculate age tier based on seconds
 */
function getAgeTier(ageSeconds: number): AgeTier {
  const hours = ageSeconds / HOUR_SECONDS;
  if (hours < 24) return 0;
  if (hours < 48) return 1;
  if (hours < 72) return 2;
  return 3;
}

/**
 * Format age for display
 */
function formatAge(ageSeconds: number): string {
  const days = Math.floor(ageSeconds / DAY_SECONDS);
  const hours = Math.floor((ageSeconds % DAY_SECONDS) / HOUR_SECONDS);
  const minutes = Math.floor((ageSeconds % HOUR_SECONDS) / 60);
  
  if (days >= 1) {
    return `${days}d ${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}

/**
 * Convert threshold days to seconds
 */
function thresholdDaysToSeconds(thresholdDays: number): number {
  return thresholdDays * DAY_SECONDS;
}

// =============================================================================
// Blocker Detection
// =============================================================================

/**
 * Detect blocker type from order data
 */
function detectBlocker(order: any): BlockerType {
  // Payment issues
  if (order.financial_status === "pending" || order.financial_status === "partially_paid") {
    return "payment";
  }
  
  // Check for fraud risk (if tags contain fraud-related terms)
  const tags = order.tags || [];
  if (tags.some((t: string) => t.toLowerCase().includes("fraud") || t.toLowerCase().includes("risk"))) {
    return "fraud";
  }
  
  // Check for hold
  if (tags.some((t: string) => t.toLowerCase().includes("hold") || t.toLowerCase().includes("review"))) {
    return "hold";
  }
  
  // Address issues - missing or incomplete shipping address
  const shipping = order.shipping_address;
  if (!shipping || !shipping.address1 || !shipping.city || !shipping.country) {
    return "address";
  }
  
  // Note: Inventory blockers would require checking inventory levels
  // which is more complex - for now we'll leave it as null
  
  return null;
}

/**
 * Extract destination from shipping address
 */
function getDestination(shippingAddress: any): string | null {
  if (!shippingAddress) return null;
  
  // Prefer country code, fallback to country name
  if (shippingAddress.country_code) {
    return shippingAddress.country_code;
  }
  if (shippingAddress.country) {
    return shippingAddress.country;
  }
  return null;
}

/**
 * Extract shipping method from order
 */
function getShippingMethod(order: any): string | null {
  const lineItems = order.line_items || [];
  // Check if there's shipping info in line items or elsewhere
  if (order.shipping_lines && order.shipping_lines.length > 0) {
    return order.shipping_lines[0].title || null;
  }
  return null;
}

/**
 * Count items in order
 */
function countItems(lineItems: any[]): number {
  if (!lineItems || !Array.isArray(lineItems)) return 0;
  return lineItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
}

// =============================================================================
// Main Query
// =============================================================================

/**
 * Fetch slow mover orders for a shop
 */
export async function fetchSlowMovers(
  shopId: string,
  thresholdDays: number,
  limit: LimitOption
): Promise<SlowMoversResult> {
  const supabase = createClient();
  const now = new Date();
  const thresholdSeconds = thresholdDaysToSeconds(thresholdDays);
  const thresholdDate = new Date(now.getTime() - thresholdSeconds * 1000);
  
  // Build base query for open orders
  let query = supabase
    .from("orders")
    .select("*")
    .eq("shop_id", shopId)
    .is("cancelled_at", null)
    .is("closed_at", null)
    .or("fulfillment_status.is.null,fulfillment_status.eq.unfulfilled,fulfillment_status.eq.partial")
    .order("created_at_shopify", { ascending: true });
  
  // Apply threshold filter if not 0 (all)
  if (thresholdDays > 0) {
    query = query.lt("created_at_shopify", thresholdDate.toISOString());
  }
  
  // First, get count of all matching orders
  let countQuery = supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("shop_id", shopId)
    .is("cancelled_at", null)
    .is("closed_at", null)
    .or("fulfillment_status.is.null,fulfillment_status.eq.unfulfilled,fulfillment_status.eq.partial");
  
  if (thresholdDays > 0) {
    countQuery = countQuery.lt("created_at_shopify", thresholdDate.toISOString());
  }
  
  const { count: totalCount } = await countQuery;
  
  // Fetch with limit
  const { data: orders, error } = await query.limit(limit);
  
  if (error) {
    console.error("Error fetching slow movers:", error);
    return {
      orders: [],
      totalMatchingCount: 0,
      isFallback: false,
      fallbackMessage: null,
    };
  }
  
  let resultOrders = orders || [];
  let isFallback = false;
  let fallbackMessage: string | null = null;
  
  // Fallback: if threshold filtered results < 20, fetch oldest open orders instead
  if (thresholdDays > 0 && resultOrders.length < 20) {
    const { data: fallbackOrders } = await supabase
      .from("orders")
      .select("*")
      .eq("shop_id", shopId)
      .is("cancelled_at", null)
      .is("closed_at", null)
      .or("fulfillment_status.is.null,fulfillment_status.eq.unfulfilled,fulfillment_status.eq.partial")
      .order("created_at_shopify", { ascending: true })
      .limit(limit);
    
    if (fallbackOrders && fallbackOrders.length > resultOrders.length) {
      resultOrders = fallbackOrders;
      isFallback = true;
      fallbackMessage = `Not enough >${thresholdDays} day orders — showing oldest open orders`;
    }
  }
  
  // Process orders into SlowMoverOrder format
  const processedOrders: SlowMoverOrder[] = resultOrders.map(order => {
    const createdAt = order.created_at_shopify || order.created_at;
    const ageSeconds = Math.floor((now.getTime() - new Date(createdAt).getTime()) / 1000);
    
    // Extract first product image from line items
    const lineItems = order.line_items || [];
    const firstItem = lineItems[0];
    const productImage = firstItem?.image || firstItem?.image_url || firstItem?.product_image || null;
    
    return {
      orderId: order.id,
      shopifyOrderId: order.shopify_order_id,
      orderNumber: order.name || `#${order.order_number}`,
      createdAt,
      ageSeconds,
      ageDisplay: formatAge(ageSeconds),
      financialStatus: order.financial_status,
      fulfillmentStatus: order.fulfillment_status || "unfulfilled",
      isOpen: true,
      blockerType: detectBlocker(order),
      destination: getDestination(order.shipping_address),
      itemsCount: countItems(order.line_items),
      orderValue: parseFloat(order.total_price) || 0,
      currency: order.currency || "USD",
      shippingMethod: getShippingMethod(order),
      ageTier: getAgeTier(ageSeconds),
      productImage,
    };
  });
  
  // Sort by age (oldest first), then by created_at, then by order_id
  processedOrders.sort((a, b) => {
    if (b.ageSeconds !== a.ageSeconds) {
      return b.ageSeconds - a.ageSeconds; // Oldest first (largest age)
    }
    if (a.createdAt !== b.createdAt) {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    return a.orderId.localeCompare(b.orderId);
  });
  
  return {
    orders: processedOrders,
    totalMatchingCount: totalCount || processedOrders.length,
    isFallback,
    fallbackMessage,
  };
}

/**
 * Compute KPI stats from slow mover orders
 */
export function computeSlowMoverStats(orders: SlowMoverOrder[]) {
  if (orders.length === 0) {
    return {
      oldestAge: "—",
      countPastThreshold: 0,
      blockedCount: 0,
      backlogValue: 0,
    };
  }
  
  const oldestOrder = orders[0]; // Already sorted oldest first
  const blockedCount = orders.filter(o => o.blockerType !== null).length;
  const backlogValue = orders.reduce((sum, o) => sum + o.orderValue, 0);
  
  return {
    oldestAge: oldestOrder.ageDisplay,
    countPastThreshold: orders.length,
    blockedCount,
    backlogValue,
  };
}
