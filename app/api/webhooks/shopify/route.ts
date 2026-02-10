import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getShopByDomain, markShopUninstalled } from "@/lib/shopify/session";
import {
  processOrderWebhook,
  processProductWebhook,
  processCustomerWebhook,
  processInventoryWebhook,
} from "@/lib/shopify/webhook-handlers";

/**
 * Validate Shopify webhook HMAC
 * Shopify signs the raw request body with the app's API secret.
 * We must compute the HMAC over the exact raw bytes (not a decoded string).
 */
function validateHmac(rawBody: Buffer, hmac: string | null): boolean {
  if (!hmac) {
    console.error("[Webhook] Missing HMAC header");
    return false;
  }

  if (!process.env.SHOPIFY_API_SECRET) {
    console.error("[Webhook] Missing SHOPIFY_API_SECRET env var");
    return false;
  }

  const generatedHmac = crypto
    .createHmac("sha256", process.env.SHOPIFY_API_SECRET)
    .update(rawBody)
    .digest("base64");

  try {
    const receivedBuf = Buffer.from(hmac, "base64");
    const generatedBuf = Buffer.from(generatedHmac, "base64");

    if (receivedBuf.length !== generatedBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(receivedBuf, generatedBuf);
  } catch (err) {
    console.error("[Webhook] HMAC comparison error:", err);
    return false;
  }
}

export async function POST(request: NextRequest) {
  // Read raw body as Buffer to ensure exact bytes for HMAC verification
  const rawBodyBuffer = Buffer.from(await request.arrayBuffer());

  const hmac = request.headers.get("X-Shopify-Hmac-Sha256");
  const topic = request.headers.get("X-Shopify-Topic");
  const shopDomain = request.headers.get("X-Shopify-Shop-Domain");
  const webhookId = request.headers.get("X-Shopify-Webhook-Id");

  console.log(`[Webhook] Received: ${topic} from ${shopDomain}`);

  // Validate HMAC — reject if signature is missing or invalid
  if (!validateHmac(rawBodyBuffer, hmac)) {
    console.error("[Webhook] Invalid HMAC - rejecting");
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (!topic || !shopDomain) {
    console.error("Missing webhook headers");
    return new NextResponse("Bad Request", { status: 400 });
  }

  const rawBody = rawBodyBuffer.toString("utf8");
  const supabase = createAdminClient();

  // Log the webhook
  const { data: logEntry } = await supabase
    .from("webhook_logs")
    .insert({
      shop_domain: shopDomain,
      topic: topic,
      shopify_webhook_id: webhookId,
      payload: JSON.parse(rawBody),
    })
    .select("id")
    .single();

  try {
    // Get the shop from our database
    const shop = await getShopByDomain(shopDomain);

    if (!shop && topic !== "app/uninstalled") {
      console.warn(`Received webhook for unknown shop: ${shopDomain}`);
      // Still return 200 to prevent Shopify from retrying
      return new NextResponse("OK", { status: 200 });
    }

    const payload = JSON.parse(rawBody);

    // Route to appropriate handler based on topic
    switch (topic) {
      // App lifecycle
      case "app/uninstalled":
        await markShopUninstalled(shopDomain);
        break;

      // Orders
      case "orders/create":
      case "orders/updated":
      case "orders/paid":
      case "orders/cancelled":
      case "orders/fulfilled":
        if (shop) {
          await processOrderWebhook(shop.id, topic, payload);
        }
        break;

      // Products
      case "products/create":
      case "products/update":
      case "products/delete":
        if (shop) {
          await processProductWebhook(shop.id, topic, payload);
        }
        break;

      // Customers
      case "customers/create":
      case "customers/update":
      case "customers/delete":
        if (shop) {
          await processCustomerWebhook(shop.id, topic, payload);
        }
        break;

      // Inventory
      case "inventory_levels/update":
      case "inventory_levels/connect":
      case "inventory_levels/disconnect":
        if (shop) {
          await processInventoryWebhook(shop.id, topic, payload);
        }
        break;

      // GDPR mandatory webhooks
      case "customers/data_request":
      case "customers/redact":
      case "shop/redact":
        // Log for compliance, implement data handling as needed
        console.log(`GDPR webhook received: ${topic} for ${shopDomain}`);
        break;

      default:
        console.log(`Unhandled webhook topic: ${topic}`);
    }

    // Mark webhook as processed
    if (logEntry?.id) {
      await supabase
        .from("webhook_logs")
        .update({ processed: true, shop_id: shop?.id })
        .eq("id", logEntry.id);
    }

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error(`Error processing webhook ${topic}:`, error);

    // Log the error
    if (logEntry?.id) {
      await supabase
        .from("webhook_logs")
        .update({
          processed: false,
          error_message: error instanceof Error ? error.message : "Unknown error",
        })
        .eq("id", logEntry.id);
    }

    // Return 200 to prevent infinite retries, but log the error
    return new NextResponse("OK", { status: 200 });
  }
}
