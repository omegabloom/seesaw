import { getShopById } from "./session";

const WEBHOOK_TOPICS = [
  // These don't require protected customer data
  "products/create",
  "products/update",
  "products/delete",
  "inventory_levels/update",
  "app/uninstalled",
];

// These require protected customer data access
const PROTECTED_WEBHOOK_TOPICS = [
  "orders/create",
  "orders/updated",
  "orders/paid",
  "orders/cancelled",
  "orders/fulfilled",
  "customers/create",
  "customers/update",
];

/**
 * Register all webhooks for a shop
 */
export async function registerWebhooks(
  shopId: string,
  shopDomain: string,
  accessToken: string
): Promise<{ success: boolean; registered: string[]; failed: string[] }> {
  const webhookUrl = `${process.env.HOST}/api/webhooks/shopify`;
  const registered: string[] = [];
  const failed: string[] = [];

  console.log(`[Webhooks] Registering webhooks for ${shopDomain}`);
  console.log(`[Webhooks] Webhook URL: ${webhookUrl}`);

  if (!process.env.HOST) {
    console.error("[Webhooks] HOST environment variable is not set!");
    return { success: false, registered: [], failed: WEBHOOK_TOPICS };
  }

  // Register standard webhooks (no protected data required)
  for (const topic of WEBHOOK_TOPICS) {
    const result = await registerSingleWebhook(shopDomain, accessToken, topic, webhookUrl);
    if (result.success) {
      registered.push(topic);
    } else {
      failed.push(topic);
    }
  }

  // Try to register protected webhooks - these may fail if app doesn't have access
  console.log(`[Webhooks] Attempting to register protected data webhooks...`);
  const protectedSkipped: string[] = [];
  
  for (const topic of PROTECTED_WEBHOOK_TOPICS) {
    const result = await registerSingleWebhook(shopDomain, accessToken, topic, webhookUrl);
    if (result.success) {
      registered.push(topic);
    } else if (result.reason === "protected_data") {
      protectedSkipped.push(topic);
    } else {
      failed.push(topic);
    }
  }

  if (protectedSkipped.length > 0) {
    console.log(`[Webhooks] Skipped ${protectedSkipped.length} webhooks - requires Protected Customer Data access`);
    console.log(`[Webhooks] Request access in Partner Dashboard: https://partners.shopify.com`);
  }

  return {
    success: failed.length === 0,
    registered,
    failed,
  };
}

async function registerSingleWebhook(
  shopDomain: string,
  accessToken: string,
  topic: string,
  webhookUrl: string
): Promise<{ success: boolean; reason?: string }> {
  try {
    const response = await fetch(
      `https://${shopDomain}/admin/api/2024-10/webhooks.json`,
      {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          webhook: {
            topic: topic,
            address: webhookUrl,
            format: "json",
          },
        }),
      }
    );

    if (response.ok) {
      console.log(`Registered webhook: ${topic}`);
      return { success: true };
    }

    const error = await response.text();
    
    // 422 often means webhook already exists, which is fine
    if (response.status === 422 && error.includes("already been taken")) {
      console.log(`Webhook already exists: ${topic}`);
      return { success: true };
    }
    
    // Protected customer data error
    if (error.includes("protected customer data") || error.includes("do not have permission")) {
      console.log(`Webhook requires protected data access: ${topic}`);
      return { success: false, reason: "protected_data" };
    }
    
    console.error(`Failed to register webhook ${topic}:`, error);
    return { success: false, reason: "error" };
  } catch (error) {
    console.error(`Error registering webhook ${topic}:`, error);
    return { success: false, reason: "exception" };
  } finally {
    // Small delay to respect rate limits
    await new Promise((r) => setTimeout(r, 250));
  }
}

/**
 * List all registered webhooks for a shop
 */
export async function listWebhooks(
  shopDomain: string,
  accessToken: string
): Promise<any[]> {
  try {
    const response = await fetch(
      `https://${shopDomain}/admin/api/2024-10/webhooks.json`,
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
        },
      }
    );

    if (!response.ok) {
      console.error("Failed to list webhooks:", await response.text());
      return [];
    }

    const data = await response.json();
    return data.webhooks || [];
  } catch (error) {
    console.error("Error listing webhooks:", error);
    return [];
  }
}

/**
 * Delete a specific webhook
 */
export async function deleteWebhook(
  shopDomain: string,
  accessToken: string,
  webhookId: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://${shopDomain}/admin/api/2024-10/webhooks/${webhookId}.json`,
      {
        method: "DELETE",
        headers: {
          "X-Shopify-Access-Token": accessToken,
        },
      }
    );

    return response.ok;
  } catch (error) {
    console.error("Error deleting webhook:", error);
    return false;
  }
}
