/**
 * Billboard Rankings Computation
 * 
 * Computes weekly product rankings based on order appearances,
 * tracking movement, weeks on chart, and historical positions.
 */

import { createClient } from "@/lib/supabase/client";

// =============================================================================
// Types
// =============================================================================

export interface WeeklyProductRank {
  productId: string;
  shopifyProductId: number;
  rank: number;
  orderAppearances: number;
  weekStart: string; // ISO date
}

export interface BillboardRow {
  productId: string;
  shopifyProductId: number;
  title: string;
  images: string[];
  rankThisWeek: number;
  rankLastWeek: number | null;
  rankTwoWeeksAgo: number | null;
  weeksOnChart: number;
  movement: number | null; // positive = up, negative = down
  isNew: boolean;
  isReentry: boolean;
  orderAppearances: number;
}

interface ProductInfo {
  id: string;
  shopify_product_id: number;
  title: string;
  images: any[];
}

interface OrderLineItem {
  product_id: number;
  quantity: number;
}

// =============================================================================
// Date Utilities
// =============================================================================

/**
 * Get the start of the week (Monday) for a given date
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get rolling week boundaries
 * Returns { thisWeek, lastWeek, twoWeeksAgo } as ISO strings
 */
function getWeekBoundaries(): {
  thisWeekStart: Date;
  thisWeekEnd: Date;
  lastWeekStart: Date;
  lastWeekEnd: Date;
  twoWeeksAgoStart: Date;
  twoWeeksAgoEnd: Date;
} {
  const now = new Date();
  
  // This week: last 7 days rolling
  const thisWeekEnd = now;
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(thisWeekStart.getDate() - 7);
  
  // Last week: 7-14 days ago
  const lastWeekEnd = new Date(thisWeekStart);
  const lastWeekStart = new Date(lastWeekEnd);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  
  // Two weeks ago: 14-21 days ago
  const twoWeeksAgoEnd = new Date(lastWeekStart);
  const twoWeeksAgoStart = new Date(twoWeeksAgoEnd);
  twoWeeksAgoStart.setDate(twoWeeksAgoStart.getDate() - 7);
  
  return {
    thisWeekStart,
    thisWeekEnd,
    lastWeekStart,
    lastWeekEnd,
    twoWeeksAgoStart,
    twoWeeksAgoEnd,
  };
}

// =============================================================================
// Ranking Computation
// =============================================================================

/**
 * Count product appearances in orders within a date range
 */
async function countProductAppearances(
  supabase: ReturnType<typeof createClient>,
  shopId: string,
  startDate: Date,
  endDate: Date
): Promise<Map<number, number>> {
  const { data: orders, error } = await supabase
    .from("orders")
    .select("line_items")
    .eq("shop_id", shopId)
    .gte("created_at_shopify", startDate.toISOString())
    .lt("created_at_shopify", endDate.toISOString());

  if (error) {
    console.error("Error fetching orders for billboard:", error);
    return new Map();
  }

  // Count unique product appearances per order (not units sold)
  const appearances = new Map<number, number>();
  
  for (const order of orders || []) {
    const lineItems: OrderLineItem[] = order.line_items || [];
    const productsInOrder = new Set<number>();
    
    for (const item of lineItems) {
      if (item.product_id) {
        productsInOrder.add(item.product_id);
      }
    }
    
    // Each product counts once per order
    for (const productId of productsInOrder) {
      appearances.set(productId, (appearances.get(productId) || 0) + 1);
    }
  }
  
  return appearances;
}

/**
 * Convert appearances map to ranked list
 */
function rankProducts(appearances: Map<number, number>): Map<number, { rank: number; count: number }> {
  const sorted = Array.from(appearances.entries())
    .sort((a, b) => b[1] - a[1]); // Sort by count descending
  
  const ranked = new Map<number, { rank: number; count: number }>();
  
  sorted.forEach(([productId, count], index) => {
    ranked.set(productId, { rank: index + 1, count });
  });
  
  return ranked;
}

/**
 * Track how many weeks a product has appeared on the chart
 * Uses a simple heuristic based on whether product appears in each week
 */
function calculateWeeksOnChart(
  productId: number,
  thisWeek: Map<number, { rank: number; count: number }>,
  lastWeek: Map<number, { rank: number; count: number }>,
  twoWeeksAgo: Map<number, { rank: number; count: number }>
): number {
  let weeks = 0;
  if (thisWeek.has(productId)) weeks++;
  if (lastWeek.has(productId)) weeks++;
  if (twoWeeksAgo.has(productId)) weeks++;
  return Math.max(1, weeks); // At least 1 if showing on chart
}

// =============================================================================
// Main Export
// =============================================================================

/**
 * Compute full Billboard chart data for a shop
 */
export async function computeBillboardChart(
  shopId: string,
  maxProducts: number = 20
): Promise<BillboardRow[]> {
  const supabase = createClient();
  const bounds = getWeekBoundaries();
  
  // Fetch appearances for each week in parallel
  const [thisWeekAppearances, lastWeekAppearances, twoWeeksAgoAppearances] = await Promise.all([
    countProductAppearances(supabase, shopId, bounds.thisWeekStart, bounds.thisWeekEnd),
    countProductAppearances(supabase, shopId, bounds.lastWeekStart, bounds.lastWeekEnd),
    countProductAppearances(supabase, shopId, bounds.twoWeeksAgoStart, bounds.twoWeeksAgoEnd),
  ]);
  
  // Rank each week's products
  const thisWeekRanked = rankProducts(thisWeekAppearances);
  const lastWeekRanked = rankProducts(lastWeekAppearances);
  const twoWeeksAgoRanked = rankProducts(twoWeeksAgoAppearances);
  
  // Get all unique product IDs that appear this week
  const thisWeekProductIds = Array.from(thisWeekRanked.keys());
  
  if (thisWeekProductIds.length === 0) {
    return [];
  }
  
  // Fetch product info
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, shopify_product_id, title, images")
    .eq("shop_id", shopId)
    .in("shopify_product_id", thisWeekProductIds);
  
  if (productsError) {
    console.error("Error fetching products for billboard:", productsError);
    return [];
  }
  
  // Create a map for quick lookup
  const productMap = new Map<number, ProductInfo>();
  for (const p of products || []) {
    productMap.set(p.shopify_product_id, p);
  }
  
  // Build billboard rows
  const billboardRows: BillboardRow[] = [];
  
  for (const [shopifyProductId, { rank, count }] of thisWeekRanked) {
    if (rank > maxProducts) continue;
    
    const productInfo = productMap.get(shopifyProductId);
    if (!productInfo) continue;
    
    const lastWeekData = lastWeekRanked.get(shopifyProductId);
    const twoWeeksAgoData = twoWeeksAgoRanked.get(shopifyProductId);
    
    const rankLastWeek = lastWeekData?.rank ?? null;
    const rankTwoWeeksAgo = twoWeeksAgoData?.rank ?? null;
    
    // Calculate movement (positive = moving up = good)
    const movement = rankLastWeek !== null ? rankLastWeek - rank : null;
    
    // Determine if new or re-entry
    const isNew = rankLastWeek === null && rankTwoWeeksAgo === null;
    const isReentry = rankLastWeek === null && rankTwoWeeksAgo !== null;
    
    // Calculate weeks on chart
    const weeksOnChart = calculateWeeksOnChart(
      shopifyProductId,
      thisWeekRanked,
      lastWeekRanked,
      twoWeeksAgoRanked
    );
    
    // Extract image URLs from product images JSONB
    const images: string[] = [];
    if (productInfo.images && Array.isArray(productInfo.images)) {
      for (const img of productInfo.images.slice(0, 4)) {
        if (typeof img === 'string') {
          images.push(img);
        } else if (img && typeof img === 'object' && img.src) {
          images.push(img.src);
        }
      }
    }
    
    billboardRows.push({
      productId: productInfo.id,
      shopifyProductId,
      title: productInfo.title,
      images,
      rankThisWeek: rank,
      rankLastWeek,
      rankTwoWeeksAgo,
      weeksOnChart,
      movement,
      isNew,
      isReentry,
      orderAppearances: count,
    });
  }
  
  // Sort by rank and return
  return billboardRows.sort((a, b) => a.rankThisWeek - b.rankThisWeek);
}
