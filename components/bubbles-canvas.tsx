"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useShop } from "@/lib/context/shop-context";
import { useResourceRealtime } from "@/lib/hooks/use-realtime";
import { createClient } from "@/lib/supabase/client";
import { X } from "lucide-react";
import Matter from "matter-js";
import gsap from "gsap";
import { getBubblesViewConfig } from "@/app/dashboard/settings/page";

// =============================================================================
// Types
// =============================================================================

interface OrderEvent {
  id: string;
  createdAt: number;
  totalPrice?: number;
  currency?: string;
  itemCount: number;
  orderNumber?: string;
  customerName?: string;
  products: Array<{
    productId: string;
    title?: string;
    imageUrl: string;
    quantity: number;
  }>;
}

type BubbleState = "SPAWN" | "FLOAT" | "POP" | "REVEAL" | "EXIT";

interface BubbleEntity {
  id: string;
  orderEvent: OrderEvent;
  state: BubbleState;
  stateStartedAt: number;
  body: Matter.Body;
  radius: number;
  images: string[];
  popPosition: { x: number; y: number } | null;
  spawnProgress: number; // 0-1 for spawn animation
  popProgress: number; // 0-1 for pop animation
  revealProgress: number; // 0-1 for reveal fade
  exitProgress: number; // 0-1 for exit fade
}

interface BubblesCanvasProps {
  onClose: () => void;
}

// =============================================================================
// Constants
// =============================================================================

const MAX_BUBBLES = 12;
const R_MIN = 45;
const R_MAX = 160;
const K_RADIUS = 25;
const BIG_ORDER_THRESHOLD = 8;

// Timing (ms)
const POP_AFTER_MS = 10000;
const BIG_ORDER_EXTRA_MS = 3000;
const REVEAL_MS = 4000;
const SPAWN_ANIM_MS = 250;
const POP_ANIM_MS = 350;
const EXIT_FADE_MS = 1200;

// Physics - Super Buster Bros / Pang style
const WALL_PADDING = 0;
const RESTITUTION = 1.0; // Perfect bounce
const FRICTION_AIR = 0; // No air resistance
const FRICTION = 0; // No surface friction
const DENSITY = 0.001;
const GRAVITY = 0.8; // Strong gravity for bouncy feel

// Horizontal speed by bubble size (smaller = faster)
const H_SPEED_MIN = 2;
const H_SPEED_MAX = 5;

// Clamp max Y position (don't let bubbles exit top)
const TOP_CLAMP_PADDING = 80;

// Placeholder for missing images
const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect fill='%23374151' width='200' height='200'/%3E%3Ccircle cx='100' cy='80' r='40' fill='%236B7280'/%3E%3Crect x='60' y='130' width='80' height='40' rx='4' fill='%236B7280'/%3E%3C/svg%3E";

// =============================================================================
// Utility Functions
// =============================================================================

function computeRadius(itemCount: number): number {
  const r = R_MIN + K_RADIUS * Math.sqrt(itemCount);
  return Math.min(R_MAX, Math.max(R_MIN, r));
}

function isBigOrder(itemCount: number): boolean {
  return itemCount >= BIG_ORDER_THRESHOLD;
}

function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

// =============================================================================
// 8-Bit Arcade Color Palette (Pang/Buster Bros style)
// =============================================================================

const ARCADE_COLORS = [
  { base: "#E53935", light: "#FF6F60", dark: "#AB000D" }, // Red
  { base: "#1E88E5", light: "#6AB7FF", dark: "#005CB2" }, // Blue
  { base: "#43A047", light: "#76D275", dark: "#00701A" }, // Green
  { base: "#E91E63", light: "#FF6090", dark: "#B0003A" }, // Pink
  { base: "#FDD835", light: "#FFFF6B", dark: "#C6A700" }, // Yellow
  { base: "#8E24AA", light: "#C158DC", dark: "#5C007A" }, // Purple
  { base: "#FF6F00", light: "#FFA040", dark: "#C43E00" }, // Orange
];

function getBubbleColor(orderId: string): typeof ARCADE_COLORS[0] {
  // Deterministic color based on order ID
  let hash = 0;
  for (let i = 0; i < orderId.length; i++) {
    hash = ((hash << 5) - hash) + orderId.charCodeAt(i);
    hash = hash & hash;
  }
  return ARCADE_COLORS[Math.abs(hash) % ARCADE_COLORS.length];
}

// =============================================================================
// 8-Bit Warehouse Background
// =============================================================================

function drawWarehouseBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  // Dark warehouse gradient background
  const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
  bgGradient.addColorStop(0, "#0a0a12");
  bgGradient.addColorStop(0.5, "#12121a");
  bgGradient.addColorStop(1, "#1a1a24");
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // Pixel size for 8-bit look
  const px = 4;

  // Draw brick wall pattern (back wall)
  const brickW = px * 12;
  const brickH = px * 6;
  const brickColor1 = "#1e1e28";
  const brickColor2 = "#16161e";
  const mortarColor = "#0e0e14";

  for (let row = 0; row < Math.ceil(height / brickH); row++) {
    const offset = (row % 2) * (brickW / 2);
    for (let col = -1; col < Math.ceil(width / brickW) + 1; col++) {
      const bx = col * brickW + offset;
      const by = row * brickH;
      
      // Mortar (gap)
      ctx.fillStyle = mortarColor;
      ctx.fillRect(bx, by, brickW, brickH);
      
      // Brick with slight color variation
      const color = ((row + col) % 3 === 0) ? brickColor2 : brickColor1;
      ctx.fillStyle = color;
      ctx.fillRect(bx + px, by + px, brickW - px * 2, brickH - px * 2);
    }
  }

  // Draw metal shelving units on sides
  const shelfColor = "#2a2a36";
  const shelfHighlight = "#3a3a48";
  const shelfShadow = "#1a1a22";
  const shelfWidth = px * 20;
  const shelfSpacing = px * 40;

  // Left shelving
  ctx.fillStyle = shelfShadow;
  ctx.fillRect(0, 0, shelfWidth + px, height);
  ctx.fillStyle = shelfColor;
  ctx.fillRect(0, 0, shelfWidth, height);
  
  // Shelf horizontal bars
  for (let sy = shelfSpacing; sy < height; sy += shelfSpacing) {
    ctx.fillStyle = shelfHighlight;
    ctx.fillRect(0, sy, shelfWidth, px * 2);
    ctx.fillStyle = shelfShadow;
    ctx.fillRect(0, sy + px * 2, shelfWidth, px);
  }

  // Right shelving
  ctx.fillStyle = shelfShadow;
  ctx.fillRect(width - shelfWidth - px, 0, shelfWidth + px, height);
  ctx.fillStyle = shelfColor;
  ctx.fillRect(width - shelfWidth, 0, shelfWidth, height);
  
  for (let sy = shelfSpacing; sy < height; sy += shelfSpacing) {
    ctx.fillStyle = shelfHighlight;
    ctx.fillRect(width - shelfWidth, sy, shelfWidth, px * 2);
    ctx.fillStyle = shelfShadow;
    ctx.fillRect(width - shelfWidth, sy + px * 2, shelfWidth, px);
  }

  // Draw floor with hazard stripes
  const floorY = height - px * 16;
  ctx.fillStyle = "#2a2a32";
  ctx.fillRect(0, floorY, width, px * 16);
  
  // Hazard stripes
  const stripeW = px * 8;
  for (let sx = 0; sx < width; sx += stripeW * 2) {
    ctx.fillStyle = "#c9a227";
    ctx.beginPath();
    ctx.moveTo(sx, floorY);
    ctx.lineTo(sx + stripeW, floorY);
    ctx.lineTo(sx + stripeW * 2, floorY + px * 4);
    ctx.lineTo(sx + stripeW, floorY + px * 4);
    ctx.closePath();
    ctx.fill();
  }
  
  // Floor highlight line
  ctx.fillStyle = "#3a3a44";
  ctx.fillRect(0, floorY, width, px);

  // Draw hanging industrial lights
  const lightSpacing = width / 4;
  for (let i = 1; i < 4; i++) {
    const lx = i * lightSpacing;
    
    // Light chain/cord
    ctx.fillStyle = "#3a3a44";
    ctx.fillRect(lx - px, 0, px * 2, px * 20);
    
    // Light fixture
    ctx.fillStyle = "#4a4a58";
    ctx.fillRect(lx - px * 6, px * 18, px * 12, px * 4);
    
    // Light glow
    const glowGradient = ctx.createRadialGradient(lx, px * 30, 0, lx, px * 30, px * 40);
    glowGradient.addColorStop(0, "rgba(255, 220, 150, 0.15)");
    glowGradient.addColorStop(0.5, "rgba(255, 220, 150, 0.05)");
    glowGradient.addColorStop(1, "rgba(255, 220, 150, 0)");
    ctx.fillStyle = glowGradient;
    ctx.fillRect(lx - px * 40, px * 20, px * 80, px * 60);
    
    // Light bulb
    ctx.fillStyle = "#ffdd99";
    ctx.fillRect(lx - px * 2, px * 22, px * 4, px * 3);
  }

  // Draw crates/boxes in corners (8-bit style)
  const crateSize = px * 14;
  const crateColor = "#3d2817";
  const crateBorder = "#2a1a0f";
  const crateHighlight = "#4d3827";

  // Bottom left crates
  drawCrate(ctx, px * 24, floorY - crateSize, crateSize, px, crateColor, crateBorder, crateHighlight);
  drawCrate(ctx, px * 24 + crateSize + px * 2, floorY - crateSize, crateSize, px, crateColor, crateBorder, crateHighlight);
  drawCrate(ctx, px * 24 + crateSize / 2, floorY - crateSize * 2 - px * 2, crateSize, px, crateColor, crateBorder, crateHighlight);

  // Bottom right crates
  drawCrate(ctx, width - px * 24 - crateSize * 2, floorY - crateSize, crateSize, px, crateColor, crateBorder, crateHighlight);
  drawCrate(ctx, width - px * 24 - crateSize, floorY - crateSize, crateSize, px, crateColor, crateBorder, crateHighlight);
}

function drawCrate(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  px: number,
  color: string,
  border: string,
  highlight: string
) {
  // Border/shadow
  ctx.fillStyle = border;
  ctx.fillRect(x, y, size, size);
  
  // Main crate
  ctx.fillStyle = color;
  ctx.fillRect(x + px, y + px, size - px * 2, size - px * 2);
  
  // Top highlight
  ctx.fillStyle = highlight;
  ctx.fillRect(x + px, y + px, size - px * 2, px * 2);
  
  // Cross pattern on crate
  ctx.fillStyle = border;
  ctx.fillRect(x + size / 2 - px, y + px * 3, px * 2, size - px * 6);
  ctx.fillRect(x + px * 3, y + size / 2 - px, size - px * 6, px * 2);
}

// =============================================================================
// Arcade-Style Bubble Drawing (Flat with highlight crescent)
// =============================================================================

function drawArcadeBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: typeof ARCADE_COLORS[0],
  alpha: number = 1,
  isBig: boolean = false
) {
  ctx.save();
  ctx.globalAlpha = alpha;

  // Main bubble (solid color)
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color.base;
  ctx.fill();

  // Dark edge (bottom-right)
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = color.dark;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Inner lighter ring
  ctx.beginPath();
  ctx.arc(x, y, radius - 4, 0, Math.PI * 2);
  ctx.strokeStyle = color.light;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Highlight crescent (top-left) - classic arcade style
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.clip();
  
  // Large white highlight arc
  ctx.beginPath();
  ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.7, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.fill();
  
  // Smaller bright highlight
  ctx.beginPath();
  ctx.arc(x - radius * 0.4, y - radius * 0.4, radius * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.fill();
  
  ctx.restore();

  // Big order golden glow
  if (isBig) {
    ctx.beginPath();
    ctx.arc(x, y, radius + 6, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 215, 0, 0.6)";
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  ctx.restore();
}

// Legacy function name wrapper for compatibility
function drawGlossyBubble(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  alpha: number = 1,
  isBig: boolean = false,
  orderId: string = ""
) {
  const color = getBubbleColor(orderId);
  drawArcadeBubble(ctx, x, y, radius, color, alpha, isBig);
}

// =============================================================================
// Pop Animation Drawing
// =============================================================================

function drawPopAnimation(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  progress: number, // 0-1
  orderId: string = ""
) {
  ctx.save();
  const color = getBubbleColor(orderId);

  // Scale up and fade out
  const scale = 1 + progress * 0.5;
  const alpha = 1 - progress;

  // Draw expanding bubble
  drawArcadeBubble(ctx, x, y, radius * scale, color, alpha * 0.5);

  // Draw expanding ring with bubble color
  ctx.beginPath();
  ctx.arc(x, y, radius * (1 + progress * 0.8), 0, Math.PI * 2);
  ctx.strokeStyle = color.light;
  ctx.globalAlpha = 0.5 * (1 - progress);
  ctx.lineWidth = 3 * (1 - progress);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Sparkle particles in bubble color
  const numSparkles = 8;
  for (let i = 0; i < numSparkles; i++) {
    const angle = (i / numSparkles) * Math.PI * 2;
    const dist = radius * (0.5 + progress * 1.2);
    const px = x + Math.cos(angle) * dist;
    const py = y + Math.sin(angle) * dist;
    const sparkleSize = 4 * (1 - progress * 0.8);

    ctx.beginPath();
    ctx.arc(px, py, sparkleSize, 0, Math.PI * 2);
    ctx.fillStyle = i % 2 === 0 ? color.light : "#ffffff";
    ctx.globalAlpha = 0.8 * (1 - progress);
    ctx.fill();
  }

  ctx.restore();
}

// =============================================================================
// Product Reveal Drawing - Tiled Grid Layout
// =============================================================================

function drawProductReveal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  images: HTMLImageElement[],
  progress: number, // fade progress 0-1
  isFadingOut: boolean = false,
  totalImageCount: number = 0 // Total SKUs in order (for "+X more" display)
) {
  ctx.save();
  
  const alpha = isFadingOut ? 1 - progress : progress;
  ctx.globalAlpha = alpha;

  // Only show max 2 images
  const displayImages = images.slice(0, 2);
  const imageCount = displayImages.length;
  const moreCount = totalImageCount > 2 ? totalImageCount - 2 : 0;
  
  if (imageCount === 0) {
    ctx.restore();
    return;
  }

  // Large card sizes for dramatic reveal
  const cardSize = 500;
  const gap = 30;

  const drawCard = (img: HTMLImageElement, cx: number, cy: number) => {
    if (!img.complete || img.naturalWidth === 0) return;
    
    ctx.save();
    
    // Shadow
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 25;
    ctx.shadowOffsetY = 10;

    // Draw card background
    ctx.beginPath();
    roundRect(ctx, cx - cardSize / 2, cy - cardSize / 2, cardSize, cardSize, 16);
    ctx.fillStyle = "#1a1a1a";
    ctx.fill();
    ctx.clip();
    
    ctx.shadowColor = "transparent";
    
    // Draw image (cover fit)
    const imgRatio = img.naturalWidth / img.naturalHeight;
    let drawW, drawH, drawX, drawY;
    
    if (imgRatio > 1) {
      // Landscape - fit height
      drawH = cardSize;
      drawW = cardSize * imgRatio;
      drawX = cx - drawW / 2;
      drawY = cy - cardSize / 2;
    } else {
      // Portrait or square - fit width
      drawW = cardSize;
      drawH = cardSize / imgRatio;
      drawX = cx - cardSize / 2;
      drawY = cy - drawH / 2;
    }
    
    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    // Border
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  };

  if (imageCount === 1) {
    drawCard(displayImages[0], x, y);
    
    // Show "+X more" to the right of the single card
    if (moreCount > 0) {
      const moreText = `+${moreCount} more`;
      ctx.font = "bold 28px system-ui";
      const textMetrics = ctx.measureText(moreText);
      const textX = x + cardSize / 2 + 40;
      const textY = y + 10;
      const padding = 16;
      
      // Draw transparent black background
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.beginPath();
      ctx.roundRect(textX - padding, textY - 24 - padding, textMetrics.width + padding * 2, 36 + padding * 2, 8);
      ctx.fill();
      
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.textAlign = "left";
      ctx.fillText(moreText, textX, textY);
    }
  } else {
    // Side by side (2 images)
    const offset = (cardSize + gap) / 2;
    drawCard(displayImages[0], x - offset, y);
    drawCard(displayImages[1], x + offset, y);
    
    // Show "+X more" to the right of the grid
    if (moreCount > 0) {
      const moreText = `+${moreCount} more`;
      ctx.font = "bold 28px system-ui";
      const textMetrics = ctx.measureText(moreText);
      const textX = x + offset + cardSize / 2 + 40;
      const textY = y + 10;
      const padding = 16;
      
      // Draw transparent black background
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.beginPath();
      ctx.roundRect(textX - padding, textY - 24 - padding, textMetrics.width + padding * 2, 36 + padding * 2, 8);
      ctx.fill();
      
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.textAlign = "left";
      ctx.fillText(moreText, textX, textY);
    }
  }

  ctx.restore();
}

// =============================================================================
// Status Indicator Drawing (top right)
// =============================================================================

function drawStatusIndicator(
  ctx: CanvasRenderingContext2D,
  width: number,
  isLiveMode: boolean,
  ordersToReplay: number,
  spawnedCount: number
) {
  ctx.save();

  // Position: top right with padding
  const padding = 24;
  const statusText = isLiveMode 
    ? `Live — last ${ordersToReplay} orders`
    : `Replaying — ${spawnedCount}/${ordersToReplay} orders`;
  
  // Measure text
  ctx.font = "14px system-ui, -apple-system, sans-serif";
  const textMetrics = ctx.measureText(statusText);
  const textWidth = textMetrics.width;
  
  // Banner dimensions
  const bannerHeight = 36;
  const bannerWidth = textWidth + 48; // Extra space for dot and padding
  const bannerX = width - bannerWidth - padding - 48; // Account for close button
  const bannerY = padding;

  // Background
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.beginPath();
  roundRect(ctx, bannerX, bannerY, bannerWidth, bannerHeight, 8);
  ctx.fill();

  // Pulsing dot
  const pulseScale = 0.7 + Math.sin(Date.now() / 300) * 0.3;
  const dotX = bannerX + 18;
  const dotY = bannerY + bannerHeight / 2;
  
  // Glow
  ctx.beginPath();
  ctx.arc(dotX, dotY, 6 * pulseScale, 0, Math.PI * 2);
  ctx.fillStyle = isLiveMode ? "rgba(34, 197, 94, 0.4)" : "rgba(59, 130, 246, 0.4)";
  ctx.fill();
  
  // Solid dot
  ctx.beginPath();
  ctx.arc(dotX, dotY, 5 * pulseScale, 0, Math.PI * 2);
  ctx.fillStyle = isLiveMode ? "#22c55e" : "#3b82f6"; // Green for live, blue for replay
  ctx.fill();

  // Text
  ctx.font = "14px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(statusText, dotX + 14, dotY);

  ctx.restore();
}

// =============================================================================
// Order Info Banner Drawing
// =============================================================================

function drawWaitingMessage(
  ctx: CanvasRenderingContext2D,
  width: number,
  alpha: number
) {
  if (alpha <= 0) return;
  
  ctx.save();
  ctx.globalAlpha = alpha;

  // Draw semi-transparent background banner at top center
  const bannerWidth = 420;
  const bannerHeight = 70;
  const bannerX = (width - bannerWidth) / 2;
  const bannerY = 30;

  // Background
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.beginPath();
  roundRect(ctx, bannerX, bannerY, bannerWidth, bannerHeight, 16);
  ctx.fill();

  // Border
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Pulsing live dot
  const pulseScale = 0.8 + Math.sin(Date.now() / 300) * 0.2;
  ctx.beginPath();
  ctx.arc(bannerX + 35, bannerY + bannerHeight / 2, 8 * pulseScale, 0, Math.PI * 2);
  ctx.fillStyle = "#22c55e"; // Green
  ctx.fill();
  
  // Glow effect on dot
  ctx.beginPath();
  ctx.arc(bannerX + 35, bannerY + bannerHeight / 2, 12 * pulseScale, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(34, 197, 94, 0.3)";
  ctx.fill();

  // Text
  ctx.font = "24px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("Live — waiting for new orders", bannerX + 60, bannerY + bannerHeight / 2);

  ctx.restore();
}

function drawOrderInfoBanner(
  ctx: CanvasRenderingContext2D,
  width: number,
  orderNumber: string,
  customerName: string,
  totalPrice: number,
  currency: string,
  alpha: number
) {
  ctx.save();
  ctx.globalAlpha = alpha;

  // Draw semi-transparent background banner at top center
  const bannerWidth = 500;
  const bannerHeight = 100;
  const bannerX = (width - bannerWidth) / 2;
  const bannerY = 30;

  // Background with blur effect
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.beginPath();
  roundRect(ctx, bannerX, bannerY, bannerWidth, bannerHeight, 16);
  ctx.fill();

  // Border
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Order number and price on same line
  const priceStr = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
  }).format(totalPrice);

  ctx.font = "bold 28px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${orderNumber}  •  ${priceStr}`, width / 2, bannerY + 35);

  // Customer name
  ctx.font = "18px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.fillText(customerName, width / 2, bannerY + 70);

  ctx.restore();
}

// Helper for rounded rectangles
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

// =============================================================================
// Main Component
// =============================================================================

export function BubblesCanvas({ onClose }: BubblesCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const bubblesRef = useRef<Map<string, BubbleEntity>>(new Map());
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const backgroundRef = useRef<HTMLImageElement | null>(null);
  const animationRef = useRef<number>(0);
  const { currentShop } = useShop();
  const { events: orderEvents } = useResourceRealtime(currentShop?.id || null, "order");

  // Track processed event IDs to avoid duplicates
  const processedEventsRef = useRef<Set<string>>(new Set());
  
  // Track live mode state
  const initialOrderCountRef = useRef<number>(0); // How many initial orders were queued
  const spawnedOrderCountRef = useRef<number>(0); // How many have been spawned
  const lastBubbleExitTimeRef = useRef<number>(0); // When the last bubble finished its reveal
  const isLiveModeRef = useRef<boolean>(false); // Are we past the initial 10 orders?
  const waitingMessageAlphaRef = useRef<number>(0); // For fade in/out of waiting message

  // Load background image
  useEffect(() => {
    const img = new Image();
    img.src = "/bubbles_bg.png";
    img.onload = () => {
      backgroundRef.current = img;
    };
  }, []);

  // =============================================================================
  // Initialize Matter.js
  // =============================================================================

  useEffect(() => {
    if (!containerRef.current) return;

    const { clientWidth: width, clientHeight: height } = containerRef.current;
    const dpr = window.devicePixelRatio || 1;

    // Setup canvas
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    // Create Matter.js engine with strong gravity (Pang-style bouncing)
    const engine = Matter.Engine.create({
      gravity: { x: 0, y: GRAVITY },
    });
    engineRef.current = engine;

    // Create walls - no top wall for Pang-style (bubbles bounce high)
    const wallThickness = 100;
    const wallOptions = { 
      isStatic: true, 
      restitution: RESTITUTION, 
      friction: FRICTION,
      collisionFilter: {
        category: 0x0001, // Walls are category 1
      },
    };
    const walls = [
      // Floor (at actual bottom of screen)
      Matter.Bodies.rectangle(
        width / 2,
        height + wallThickness / 2,
        width,
        wallThickness,
        wallOptions
      ),
      // Left wall (at edge)
      Matter.Bodies.rectangle(
        -wallThickness / 2,
        height / 2,
        wallThickness,
        height * 2,
        wallOptions
      ),
      // Right wall (at edge)
      Matter.Bodies.rectangle(
        width + wallThickness / 2,
        height / 2,
        wallThickness,
        height * 2,
        wallOptions
      ),
    ];

    Matter.Composite.add(engine.world, walls);

    return () => {
      Matter.Engine.clear(engine);
      engineRef.current = null;
    };
  }, []);

  // =============================================================================
  // Load Initial Orders
  // =============================================================================

  // Store the config for use in the intro animation
  const bubblesConfigRef = useRef(getBubblesViewConfig());

  useEffect(() => {
    if (!currentShop?.id) return;

    const fetchOrders = async () => {
      const config = getBubblesViewConfig();
      bubblesConfigRef.current = config;
      
      const supabase = createClient();
      const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .eq("shop_id", currentShop.id)
        .order("created_at", { ascending: false })
        .limit(config.ordersToReplay);

      if (orders) {
        // Track how many initial orders we're loading
        initialOrderCountRef.current = orders.length;
        spawnedOrderCountRef.current = 0;
        
        // Wait for intro animation (2.5s) then spawn bubbles every 7 seconds
        const introDelay = 2500;
        orders.forEach((order, index) => {
          setTimeout(() => {
            const orderEvent = transformOrderToEvent(order);
            if (orderEvent) {
              spawnBubble(orderEvent);
              spawnedOrderCountRef.current++;
              
              // Check if we've spawned all initial orders - enter live mode
              if (spawnedOrderCountRef.current >= initialOrderCountRef.current) {
                isLiveModeRef.current = true;
              }
            }
          }, introDelay + index * 7000);
        });
        
        // If no orders, immediately enter live mode
        if (orders.length === 0) {
          isLiveModeRef.current = true;
          lastBubbleExitTimeRef.current = Date.now();
        }
      }
    };

    fetchOrders();
  }, [currentShop?.id]);

  // =============================================================================
  // Handle New Realtime Orders
  // =============================================================================

  useEffect(() => {
    if (orderEvents.length === 0) return;

    const latestEvent = orderEvents[0];
    if (!latestEvent || latestEvent.event_type !== "order_created") return;
    if (processedEventsRef.current.has(latestEvent.id)) return;

    processedEventsRef.current.add(latestEvent.id);

    const payload = latestEvent.payload;
    if (!payload) return;

    const shippingAddress = payload.shipping_address || {};
    
    const orderEvent: OrderEvent = {
      id: latestEvent.resource_id || latestEvent.id,
      createdAt: Date.now(),
      totalPrice: parseFloat(payload.total_price) || 0,
      currency: payload.currency || "USD",
      orderNumber: payload.name || payload.order_number || `#${payload.id}`,
      customerName: shippingAddress.name || payload.email || "Guest",
      itemCount: (payload.line_items || []).reduce(
        (sum: number, item: any) => sum + (item.quantity || 1),
        0
      ),
      products: (payload.line_items || []).map((item: any) => ({
        productId: item.product_id?.toString() || "",
        title: item.title || item.name || "",
        imageUrl: item.image || item.image_url || item.product_image || PLACEHOLDER_IMAGE,
        quantity: item.quantity || 1,
      })),
    };

    // Hide waiting message immediately when new order arrives
    waitingMessageAlphaRef.current = 0;
    
    spawnBubble(orderEvent);
  }, [orderEvents]);

  // =============================================================================
  // Transform DB Order to Event
  // =============================================================================

  const transformOrderToEvent = (order: any): OrderEvent | null => {
    if (!order) return null;

    const lineItems = order.line_items || [];
    const shippingAddress = order.shipping_address || {};
    
    // Get all product images from line items
    const products = lineItems.map((item: any) => ({
      productId: item.product_id?.toString() || "",
      title: item.title || item.name || "",
      imageUrl: item.image || item.image_url || item.product_image || PLACEHOLDER_IMAGE,
      quantity: item.quantity || 1,
    }));

    return {
      id: order.id,
      createdAt: new Date(order.created_at).getTime(),
      totalPrice: parseFloat(order.total_price) || 0,
      currency: order.currency || "USD",
      orderNumber: order.name || order.order_number || `#${order.shopify_order_id}`,
      customerName: shippingAddress.name || order.email || "Guest",
      itemCount: lineItems.reduce(
        (sum: number, item: any) => sum + (item.quantity || 1),
        0
      ),
      products,
    };
  };

  // =============================================================================
  // Spawn Bubble
  // =============================================================================

  const spawnBubble = useCallback((orderEvent: OrderEvent) => {
    if (!engineRef.current || !containerRef.current) return;

    const engine = engineRef.current;
    const { clientWidth: width, clientHeight: height } = containerRef.current;
    const bubbles = bubblesRef.current;

    // Check if we already have this order
    if (bubbles.has(orderEvent.id)) return;

    // Enforce MAX_BUBBLES - pop oldest if needed
    const floatingBubbles = Array.from(bubbles.values())
      .filter((b) => b.state === "FLOAT")
      .sort((a, b) => a.stateStartedAt - b.stateStartedAt);

    while (floatingBubbles.length >= MAX_BUBBLES) {
      const oldest = floatingBubbles.shift();
      if (oldest) {
        transitionBubble(oldest, "POP");
      }
    }

    // Calculate radius
    const radius = computeRadius(orderEvent.itemCount);

    // Random spawn position - start ABOVE the screen (Buster Bros style drop)
    const x = randomRange(radius + 50, width - radius - 50);
    const y = -radius - 50; // Start above the visible area

    // Create physics body with Pang-style physics
    // collisionFilter category 2 with mask 1 means bubbles only collide with walls (category 1), not each other
    const body = Matter.Bodies.circle(x, y, radius, {
      restitution: RESTITUTION,
      frictionAir: FRICTION_AIR,
      friction: FRICTION,
      density: DENSITY,
      label: orderEvent.id,
      collisionFilter: {
        category: 0x0002,
        mask: 0x0001, // Only collide with walls
      },
    });

    // Set constant horizontal velocity (Pang-style deterministic movement)
    // Smaller bubbles move faster
    const speedFactor = 1 - (radius - R_MIN) / (R_MAX - R_MIN);
    const hSpeed = H_SPEED_MIN + speedFactor * (H_SPEED_MAX - H_SPEED_MIN);
    const direction = Math.random() > 0.5 ? 1 : -1;
    Matter.Body.setVelocity(body, { x: hSpeed * direction, y: 0 });

    Matter.Composite.add(engine.world, body);

    // Preload images
    const images = orderEvent.products.slice(0, 4).map((p) => p.imageUrl);
    images.forEach((url) => {
      if (!imageCache.current.has(url)) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = url;
        imageCache.current.set(url, img);
      }
    });

    // Create bubble entity
    const bubble: BubbleEntity = {
      id: orderEvent.id,
      orderEvent,
      state: "SPAWN",
      stateStartedAt: Date.now(),
      body,
      radius,
      images,
      popPosition: null,
      spawnProgress: 0,
      popProgress: 0,
      revealProgress: 0,
      exitProgress: 0,
    };

    bubbles.set(orderEvent.id, bubble);
  }, []);

  // =============================================================================
  // Transition Bubble State
  // =============================================================================

  const transitionBubble = useCallback((bubble: BubbleEntity, newState: BubbleState) => {
    bubble.state = newState;
    bubble.stateStartedAt = Date.now();

    if (newState === "POP") {
      // Capture position for reveal
      bubble.popPosition = {
        x: bubble.body.position.x,
        y: bubble.body.position.y,
      };
      bubble.popProgress = 0;

      // Remove from physics world
      if (engineRef.current) {
        Matter.Composite.remove(engineRef.current.world, bubble.body);
      }
    } else if (newState === "REVEAL") {
      bubble.revealProgress = 0;
    } else if (newState === "EXIT") {
      bubble.exitProgress = 0;
    }
  }, []);

  // =============================================================================
  // Animation Loop
  // =============================================================================

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    const animate = () => {
      if (!engineRef.current || !containerRef.current) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const { clientWidth: width, clientHeight: height } = containerRef.current;
      const now = Date.now();

      // Update physics
      Matter.Engine.update(engineRef.current, 1000 / 60);

      // Clear canvas and draw background
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);
      
      // Draw custom background image (or fallback to procedural)
      if (backgroundRef.current) {
        // Draw image scaled to cover the canvas
        const img = backgroundRef.current;
        const imgRatio = img.width / img.height;
        const canvasRatio = width / height;
        
        let drawWidth, drawHeight, drawX, drawY;
        
        if (canvasRatio > imgRatio) {
          // Canvas is wider - fit to width
          drawWidth = width;
          drawHeight = width / imgRatio;
          drawX = 0;
          drawY = (height - drawHeight) / 2;
        } else {
          // Canvas is taller - fit to height
          drawHeight = height;
          drawWidth = height * imgRatio;
          drawX = (width - drawWidth) / 2;
          drawY = 0;
        }
        
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        
        // Dark overlay at 65% opacity
        ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
        ctx.fillRect(0, 0, width, height);
      } else {
        // Solid dark background while image loads (prevents flicker)
        ctx.fillStyle = "#0a0a0a";
        ctx.fillRect(0, 0, width, height);
      }

      // Update and draw each bubble
      const bubbles = bubblesRef.current;
      const toRemove: string[] = [];

      bubbles.forEach((bubble) => {
        const elapsed = now - bubble.stateStartedAt;
        const isBig = isBigOrder(bubble.orderEvent.itemCount);

        // State machine
        switch (bubble.state) {
          case "SPAWN": {
            bubble.spawnProgress = Math.min(1, elapsed / SPAWN_ANIM_MS);
            const scale = 0.6 + bubble.spawnProgress * 0.4;
            const { x, y } = bubble.body.position;
            drawGlossyBubble(ctx, x, y, bubble.radius * scale, bubble.spawnProgress, isBig, bubble.id);

            if (bubble.spawnProgress >= 1) {
              transitionBubble(bubble, "FLOAT");
            }
            break;
          }

          case "FLOAT": {
            let { x, y } = bubble.body.position;
            
            // Clamp Y position so bubbles don't exit top of screen
            if (y < TOP_CLAMP_PADDING + bubble.radius) {
              Matter.Body.setPosition(bubble.body, { 
                x, 
                y: TOP_CLAMP_PADDING + bubble.radius 
              });
              // Reverse vertical velocity to bounce down
              const vel = bubble.body.velocity;
              if (vel.y < 0) {
                Matter.Body.setVelocity(bubble.body, { x: vel.x, y: Math.abs(vel.y) });
              }
              y = TOP_CLAMP_PADDING + bubble.radius;
            }
            
            // Maintain constant horizontal speed (Pang-style)
            const vel = bubble.body.velocity;
            const speedFactor = 1 - (bubble.radius - R_MIN) / (R_MAX - R_MIN);
            const targetHSpeed = H_SPEED_MIN + speedFactor * (H_SPEED_MAX - H_SPEED_MIN);
            const currentDir = vel.x >= 0 ? 1 : -1;
            
            // Keep horizontal velocity constant
            if (Math.abs(Math.abs(vel.x) - targetHSpeed) > 0.5) {
              Matter.Body.setVelocity(bubble.body, { 
                x: targetHSpeed * currentDir, 
                y: vel.y 
              });
            }
            
            drawGlossyBubble(ctx, x, y, bubble.radius, 1, isBig, bubble.id);

            // Check if should pop
            const popAfter = isBig ? POP_AFTER_MS + BIG_ORDER_EXTRA_MS : POP_AFTER_MS;
            if (elapsed >= popAfter) {
              transitionBubble(bubble, "POP");
            }
            break;
          }

          case "POP": {
            bubble.popProgress = Math.min(1, elapsed / POP_ANIM_MS);
            if (bubble.popPosition) {
              drawPopAnimation(
                ctx,
                bubble.popPosition.x,
                bubble.popPosition.y,
                bubble.radius,
                bubble.popProgress,
                bubble.id
              );
            }

            if (bubble.popProgress >= 1) {
              transitionBubble(bubble, "REVEAL");
            }
            break;
          }

          case "REVEAL": {
            bubble.revealProgress = Math.min(1, elapsed / REVEAL_MS);
            if (bubble.popPosition) {
              const loadedImages = bubble.images
                .map((url) => imageCache.current.get(url))
                .filter((img): img is HTMLImageElement => !!img && img.complete && img.naturalWidth > 0);

              // Fade in for first 300ms, hold, then fade out for last 400ms
              const fadeInEnd = 300;
              const fadeOutStart = REVEAL_MS - EXIT_FADE_MS;

              // Calculate alpha for the reveal (same timing for banner and products)
              let revealAlpha = 1;
              if (elapsed < fadeInEnd) {
                revealAlpha = elapsed / fadeInEnd;
              } else if (elapsed >= fadeOutStart) {
                revealAlpha = 1 - (elapsed - fadeOutStart) / EXIT_FADE_MS;
              }

              // Draw order info banner at top center
              if (bubble.orderEvent.orderNumber || bubble.orderEvent.customerName) {
                drawOrderInfoBanner(
                  ctx,
                  width,
                  bubble.orderEvent.orderNumber || "",
                  bubble.orderEvent.customerName || "",
                  bubble.orderEvent.totalPrice || 0,
                  bubble.orderEvent.currency || "USD",
                  revealAlpha
                );
              }

              // Center the product reveal on screen
              const centerX = width / 2;
              const centerY = height / 2;
              const totalSkus = bubble.images.length;

              if (elapsed < fadeInEnd) {
                drawProductReveal(
                  ctx,
                  centerX,
                  centerY,
                  loadedImages,
                  elapsed / fadeInEnd,
                  false,
                  totalSkus
                );
              } else if (elapsed < fadeOutStart) {
                drawProductReveal(
                  ctx,
                  centerX,
                  centerY,
                  loadedImages,
                  1,
                  false,
                  totalSkus
                );
              } else {
                drawProductReveal(
                  ctx,
                  centerX,
                  centerY,
                  loadedImages,
                  (elapsed - fadeOutStart) / EXIT_FADE_MS,
                  true,
                  totalSkus
                );
              }
            }

            if (bubble.revealProgress >= 1) {
              transitionBubble(bubble, "EXIT");
            }
            break;
          }

          case "EXIT": {
            bubble.exitProgress = Math.min(1, elapsed / EXIT_FADE_MS);
            if (bubble.exitProgress >= 1) {
              toRemove.push(bubble.id);
            }
            break;
          }
        }
      });

      // Remove finished bubbles and track exit time
      toRemove.forEach((id) => {
        bubbles.delete(id);
        // Update last exit time when a bubble is removed
        lastBubbleExitTimeRef.current = now;
      });

      // Draw status indicator (top right) - always visible
      drawStatusIndicator(
        ctx,
        width,
        isLiveModeRef.current,
        bubblesConfigRef.current?.ordersToReplay || 10,
        spawnedOrderCountRef.current
      );

      // Check if we should show/hide the waiting message
      // Show if: in live mode, no bubbles active, 5 seconds since last exit
      const hasActiveBubbles = bubbles.size > 0;
      const timeSinceLastExit = now - lastBubbleExitTimeRef.current;
      const shouldShowWaiting = isLiveModeRef.current && !hasActiveBubbles && timeSinceLastExit > 5000;
      
      // Smoothly fade the waiting message in/out
      if (shouldShowWaiting) {
        waitingMessageAlphaRef.current = Math.min(1, waitingMessageAlphaRef.current + 0.02);
      } else {
        waitingMessageAlphaRef.current = Math.max(0, waitingMessageAlphaRef.current - 0.05);
      }
      
      // Draw waiting message if visible
      if (waitingMessageAlphaRef.current > 0) {
        drawWaitingMessage(ctx, width, waitingMessageAlphaRef.current);
      }

      ctx.restore();
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [transitionBubble]);

  // =============================================================================
  // Handle Resize
  // =============================================================================

  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !containerRef.current) return;

      const { clientWidth: width, clientHeight: height } = containerRef.current;
      const dpr = window.devicePixelRatio || 1;

      canvasRef.current.width = width * dpr;
      canvasRef.current.height = height * dpr;
      canvasRef.current.style.width = `${width}px`;
      canvasRef.current.style.height = `${height}px`;
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // =============================================================================
  // Handle Escape Key
  // =============================================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // =============================================================================
  // Render
  // =============================================================================

  const [showIntro, setShowIntro] = useState(true);
  const [introOrderCount, setIntroOrderCount] = useState(10);
  const introRef = useRef<HTMLDivElement>(null);

  // Set the intro order count from config on mount
  useEffect(() => {
    const config = getBubblesViewConfig();
    setIntroOrderCount(config.ordersToReplay);
  }, []);

  // GSAP intro animation
  useEffect(() => {
    if (!introRef.current) return;

    const tl = gsap.timeline({
      onComplete: () => setShowIntro(false),
    });

    // Start with a brief delay for stability, then flash effect
    tl.to(introRef.current, { opacity: 1, duration: 0.05 });
    
    // Quick flash effect
    tl.to(introRef.current, { opacity: 0.3, duration: 0.1 });
    tl.to(introRef.current, { opacity: 1, duration: 0.1 });
    tl.to(introRef.current, { opacity: 0.5, duration: 0.1 });
    tl.to(introRef.current, { opacity: 1, duration: 0.1 });

    // Hold
    tl.to(introRef.current, { opacity: 1, duration: 1.2 });

    // Fade out
    tl.to(introRef.current, { opacity: 0, duration: 0.8 });

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 bg-black overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full" />

      {/* Intro overlay */}
      {showIntro && (
        <div
          ref={introRef}
          className="absolute inset-0 z-40 flex items-center justify-center bg-black"
          style={{ opacity: 1 }}
        >
          <div className="text-center">
            <h1 className="text-6xl md:text-8xl font-bold text-white tracking-wider" style={{ textShadow: '0 0 40px rgba(255,255,255,0.5), 0 0 80px rgba(255,255,255,0.3)' }}>
              LAST {introOrderCount} ORDERS
            </h1>
            <div className="mt-4 text-2xl text-white/60 font-light tracking-widest">
              GET READY
            </div>
          </div>
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
    </div>
  );
}
