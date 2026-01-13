import { createAdminClient } from "@/lib/supabase/admin";
import { getShopById, createShopifyClient } from "./session";

const SYNC_DAYS = 90;

/**
 * Trigger initial sync for a shop (past 90 days)
 */
export async function triggerInitialSync(shopId: string): Promise<void> {
  const supabase = createAdminClient();

  // Create sync log entries
  const syncTypes = ["products", "customers", "orders", "locations", "inventory"];

  for (const resourceType of syncTypes) {
    await supabase.from("sync_logs").insert({
      shop_id: shopId,
      sync_type: "initial",
      resource_type: resourceType,
      status: "running",
    });
  }

  try {
    const shop = await getShopById(shopId);
    if (!shop) {
      throw new Error(`Shop not found: ${shopId}`);
    }

    // Sync in order of dependencies - continue on permission errors
    await syncLocations(shopId, shop.shop_domain, shop.access_token);
    await syncProducts(shopId, shop.shop_domain, shop.access_token);
    
    // Customers and Orders require protected data access
    // These may fail with 403 if the app hasn't been granted access
    try {
      await syncCustomers(shopId, shop.shop_domain, shop.access_token);
    } catch (err) {
      if (err instanceof Error && err.message.includes("403")) {
        console.warn(`[Sync] Skipping customers - protected data access not granted`);
        await updateSyncLog(supabase, shopId, "customers", "failed", 0, "Protected data access required - request access in Partner Dashboard");
      } else {
        throw err;
      }
    }
    
    try {
      await syncOrders(shopId, shop.shop_domain, shop.access_token);
    } catch (err) {
      if (err instanceof Error && err.message.includes("403")) {
        console.warn(`[Sync] Skipping orders - protected data access not granted`);
        await updateSyncLog(supabase, shopId, "orders", "failed", 0, "Protected data access required - request access in Partner Dashboard");
      } else {
        throw err;
      }
    }
    
    await syncInventory(shopId, shop.shop_domain, shop.access_token);

    // Update shop's last sync time
    await supabase
      .from("shops")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", shopId);

    console.log(`Initial sync completed for shop ${shopId}`);
  } catch (error) {
    console.error(`Initial sync failed for shop ${shopId}:`, error);
    throw error;
  }
}

/**
 * Sync locations from Shopify
 */
async function syncLocations(
  shopId: string,
  shopDomain: string,
  accessToken: string
): Promise<void> {
  const supabase = createAdminClient();

  try {
    const response = await fetch(
      `https://${shopDomain}/admin/api/2024-10/locations.json`,
      {
        headers: { "X-Shopify-Access-Token": accessToken },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch locations: ${response.status}`);
    }

    const data = await response.json();
    const locations = data.locations || [];

    for (const location of locations) {
      await supabase.from("locations").upsert(
        {
          shop_id: shopId,
          shopify_location_id: location.id,
          name: location.name,
          address: {
            address1: location.address1,
            address2: location.address2,
            city: location.city,
            province: location.province,
            country: location.country,
            zip: location.zip,
          },
          is_active: location.active,
          synced_at: new Date().toISOString(),
        },
        { onConflict: "shop_id,shopify_location_id" }
      );
    }

    await updateSyncLog(supabase, shopId, "locations", "completed", locations.length);
    console.log(`Synced ${locations.length} locations`);
  } catch (error) {
    await updateSyncLog(
      supabase,
      shopId,
      "locations",
      "failed",
      0,
      error instanceof Error ? error.message : "Unknown error"
    );
    throw error;
  }
}

/**
 * Sync products from Shopify (all products)
 */
async function syncProducts(
  shopId: string,
  shopDomain: string,
  accessToken: string
): Promise<void> {
  const supabase = createAdminClient();
  let totalSynced = 0;
  let pageInfo: string | null = null;

  try {
    do {
      const url = new URL(`https://${shopDomain}/admin/api/2024-10/products.json`);
      url.searchParams.set("limit", "250");
      if (pageInfo) {
        url.searchParams.set("page_info", pageInfo);
      }

      const response = await fetch(url.toString(), {
        headers: { "X-Shopify-Access-Token": accessToken },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.status}`);
      }

      const data = await response.json();
      const products = data.products || [];

      for (const product of products) {
        await supabase.from("products").upsert(
          {
            shop_id: shopId,
            shopify_product_id: product.id,
            title: product.title,
            description: product.body_html,
            vendor: product.vendor,
            product_type: product.product_type,
            handle: product.handle,
            status: product.status,
            tags: product.tags ? product.tags.split(", ").filter(Boolean) : [],
            images: product.images || [],
            options: product.options || [],
            variants: product.variants || [],
            created_at_shopify: product.created_at,
            updated_at_shopify: product.updated_at,
            synced_at: new Date().toISOString(),
          },
          { onConflict: "shop_id,shopify_product_id" }
        );
      }

      totalSynced += products.length;

      // Get next page from Link header
      const linkHeader = response.headers.get("Link");
      pageInfo = extractNextPageInfo(linkHeader);

      // Respect rate limits
      await sleep(500);
    } while (pageInfo);

    await updateSyncLog(supabase, shopId, "products", "completed", totalSynced);
    console.log(`Synced ${totalSynced} products`);
  } catch (error) {
    await updateSyncLog(
      supabase,
      shopId,
      "products",
      "failed",
      totalSynced,
      error instanceof Error ? error.message : "Unknown error"
    );
    throw error;
  }
}

/**
 * Sync customers from Shopify (past 90 days)
 */
async function syncCustomers(
  shopId: string,
  shopDomain: string,
  accessToken: string
): Promise<void> {
  const supabase = createAdminClient();
  let totalSynced = 0;
  let pageInfo: string | null = null;

  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - SYNC_DAYS);

  try {
    do {
      const url = new URL(`https://${shopDomain}/admin/api/2024-10/customers.json`);
      url.searchParams.set("limit", "250");
      url.searchParams.set("updated_at_min", sinceDate.toISOString());
      if (pageInfo) {
        url.searchParams.set("page_info", pageInfo);
      }

      const response = await fetch(url.toString(), {
        headers: { "X-Shopify-Access-Token": accessToken },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch customers: ${response.status}`);
      }

      const data = await response.json();
      const customers = data.customers || [];

      for (const customer of customers) {
        await supabase.from("customers").upsert(
          {
            shop_id: shopId,
            shopify_customer_id: customer.id,
            email: customer.email,
            first_name: customer.first_name,
            last_name: customer.last_name,
            phone: customer.phone,
            orders_count: customer.orders_count || 0,
            total_spent: parseFloat(customer.total_spent || "0"),
            currency: customer.currency,
            tags: customer.tags ? customer.tags.split(", ").filter(Boolean) : [],
            accepts_marketing: customer.accepts_marketing,
            default_address: customer.default_address,
            addresses: customer.addresses || [],
            created_at_shopify: customer.created_at,
            updated_at_shopify: customer.updated_at,
            synced_at: new Date().toISOString(),
          },
          { onConflict: "shop_id,shopify_customer_id" }
        );
      }

      totalSynced += customers.length;
      pageInfo = extractNextPageInfo(response.headers.get("Link"));
      await sleep(500);
    } while (pageInfo);

    await updateSyncLog(supabase, shopId, "customers", "completed", totalSynced);
    console.log(`Synced ${totalSynced} customers`);
  } catch (error) {
    await updateSyncLog(
      supabase,
      shopId,
      "customers",
      "failed",
      totalSynced,
      error instanceof Error ? error.message : "Unknown error"
    );
    throw error;
  }
}

/**
 * Sync orders from Shopify (past 90 days)
 */
async function syncOrders(
  shopId: string,
  shopDomain: string,
  accessToken: string
): Promise<void> {
  const supabase = createAdminClient();
  let totalSynced = 0;
  let pageInfo: string | null = null;

  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - SYNC_DAYS);

  try {
    do {
      const url = new URL(`https://${shopDomain}/admin/api/2024-10/orders.json`);
      url.searchParams.set("limit", "250");
      url.searchParams.set("status", "any");
      url.searchParams.set("created_at_min", sinceDate.toISOString());
      if (pageInfo) {
        url.searchParams.set("page_info", pageInfo);
      }

      const response = await fetch(url.toString(), {
        headers: { "X-Shopify-Access-Token": accessToken },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.status}`);
      }

      const data = await response.json();
      const orders = data.orders || [];

      for (const order of orders) {
        // Try to find the customer in our DB
        let customerId = null;
        if (order.customer?.id) {
          const { data: customer } = await supabase
            .from("customers")
            .select("id")
            .eq("shop_id", shopId)
            .eq("shopify_customer_id", order.customer.id)
            .single();
          customerId = customer?.id || null;
        }

        await supabase.from("orders").upsert(
          {
            shop_id: shopId,
            shopify_order_id: order.id,
            order_number: order.order_number,
            name: order.name,
            email: order.email,
            customer_id: customerId,
            shopify_customer_id: order.customer?.id || null,
            financial_status: order.financial_status,
            fulfillment_status: order.fulfillment_status,
            total_price: parseFloat(order.total_price || "0"),
            subtotal_price: parseFloat(order.subtotal_price || "0"),
            total_tax: parseFloat(order.total_tax || "0"),
            total_discounts: parseFloat(order.total_discounts || "0"),
            currency: order.currency,
            line_items: order.line_items || [],
            shipping_address: order.shipping_address,
            billing_address: order.billing_address,
            shipping_latitude: order.shipping_address?.latitude || null,
            shipping_longitude: order.shipping_address?.longitude || null,
            discount_codes: order.discount_codes || [],
            note: order.note,
            tags: order.tags ? order.tags.split(", ").filter(Boolean) : [],
            cancelled_at: order.cancelled_at,
            closed_at: order.closed_at,
            created_at_shopify: order.created_at,
            updated_at_shopify: order.updated_at,
            synced_at: new Date().toISOString(),
          },
          { onConflict: "shop_id,shopify_order_id" }
        );
      }

      totalSynced += orders.length;
      pageInfo = extractNextPageInfo(response.headers.get("Link"));
      await sleep(500);
    } while (pageInfo);

    await updateSyncLog(supabase, shopId, "orders", "completed", totalSynced);
    console.log(`Synced ${totalSynced} orders`);
  } catch (error) {
    await updateSyncLog(
      supabase,
      shopId,
      "orders",
      "failed",
      totalSynced,
      error instanceof Error ? error.message : "Unknown error"
    );
    throw error;
  }
}

/**
 * Sync inventory levels from Shopify
 */
async function syncInventory(
  shopId: string,
  shopDomain: string,
  accessToken: string
): Promise<void> {
  const supabase = createAdminClient();
  let totalSynced = 0;

  try {
    // First, get all locations
    const { data: locations } = await supabase
      .from("locations")
      .select("shopify_location_id, name")
      .eq("shop_id", shopId);

    if (!locations || locations.length === 0) {
      await updateSyncLog(supabase, shopId, "inventory", "completed", 0);
      return;
    }

    // For each location, fetch inventory levels
    for (const location of locations) {
      let pageInfo: string | null = null;

      do {
        const url = new URL(
          `https://${shopDomain}/admin/api/2024-10/inventory_levels.json`
        );
        url.searchParams.set("location_ids", location.shopify_location_id.toString());
        url.searchParams.set("limit", "250");
        if (pageInfo) {
          url.searchParams.set("page_info", pageInfo);
        }

        const response = await fetch(url.toString(), {
          headers: { "X-Shopify-Access-Token": accessToken },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch inventory levels: ${response.status}`);
        }

        const data = await response.json();
        const levels = data.inventory_levels || [];

        for (const level of levels) {
          // Get or create inventory item
          let { data: inventoryItem } = await supabase
            .from("inventory_items")
            .select("id")
            .eq("shop_id", shopId)
            .eq("shopify_inventory_item_id", level.inventory_item_id)
            .single();

          if (!inventoryItem) {
            const { data: newItem } = await supabase
              .from("inventory_items")
              .insert({
                shop_id: shopId,
                shopify_inventory_item_id: level.inventory_item_id,
              })
              .select("id")
              .single();
            inventoryItem = newItem;
          }

          await supabase.from("inventory_levels").upsert(
            {
              shop_id: shopId,
              inventory_item_id: inventoryItem?.id,
              shopify_inventory_item_id: level.inventory_item_id,
              shopify_location_id: level.location_id,
              location_name: location.name,
              available: level.available,
              synced_at: new Date().toISOString(),
            },
            { onConflict: "shop_id,shopify_inventory_item_id,shopify_location_id" }
          );
        }

        totalSynced += levels.length;
        pageInfo = extractNextPageInfo(response.headers.get("Link"));
        await sleep(500);
      } while (pageInfo);
    }

    await updateSyncLog(supabase, shopId, "inventory", "completed", totalSynced);
    console.log(`Synced ${totalSynced} inventory levels`);
  } catch (error) {
    await updateSyncLog(
      supabase,
      shopId,
      "inventory",
      "failed",
      totalSynced,
      error instanceof Error ? error.message : "Unknown error"
    );
    throw error;
  }
}

/**
 * Extract next page info from Shopify Link header
 */
function extractNextPageInfo(linkHeader: string | null): string | null {
  if (!linkHeader) return null;

  const matches = linkHeader.match(/<[^>]*page_info=([^>&]*)[^>]*>;\s*rel="next"/);
  return matches ? matches[1] : null;
}

/**
 * Update sync log entry
 */
async function updateSyncLog(
  supabase: ReturnType<typeof createAdminClient>,
  shopId: string,
  resourceType: string,
  status: "completed" | "failed",
  recordsSynced: number,
  errorMessage?: string
) {
  await supabase
    .from("sync_logs")
    .update({
      status,
      records_synced: recordsSynced,
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    })
    .eq("shop_id", shopId)
    .eq("resource_type", resourceType)
    .eq("status", "running")
    .order("started_at", { ascending: false })
    .limit(1);
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
