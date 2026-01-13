import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Emit a realtime event for connected clients
 */
async function emitRealtimeEvent(
  shopId: string,
  eventType: string,
  resourceType: string,
  resourceId: string | null,
  shopifyId: number | bigint | null,
  payload: any
) {
  const supabase = createAdminClient();

  const { data, error } = await supabase.from("realtime_events").insert({
    shop_id: shopId,
    event_type: eventType,
    resource_type: resourceType,
    resource_id: resourceId,
    shopify_id: shopifyId ? Number(shopifyId) : null,
    payload: payload,
  }).select();

  if (error) {
    console.error("[Realtime] Failed to emit event:", error);
  } else {
    console.log(`[Realtime] Emitted ${eventType} event for ${resourceType}:`, data);
  }
}

/**
 * Process order webhooks
 */
export async function processOrderWebhook(
  shopId: string,
  topic: string,
  payload: any
) {
  const supabase = createAdminClient();
  const shopifyOrderId = payload.id;

  // Map Shopify order to our schema
  const orderData = {
    shop_id: shopId,
    shopify_order_id: shopifyOrderId,
    order_number: payload.order_number,
    name: payload.name,
    email: payload.email,
    shopify_customer_id: payload.customer?.id || null,
    financial_status: payload.financial_status,
    fulfillment_status: payload.fulfillment_status,
    total_price: parseFloat(payload.total_price || "0"),
    subtotal_price: parseFloat(payload.subtotal_price || "0"),
    total_tax: parseFloat(payload.total_tax || "0"),
    total_discounts: parseFloat(payload.total_discounts || "0"),
    currency: payload.currency,
    line_items: payload.line_items || [],
    shipping_address: payload.shipping_address,
    billing_address: payload.billing_address,
    shipping_latitude: payload.shipping_address?.latitude || null,
    shipping_longitude: payload.shipping_address?.longitude || null,
    discount_codes: payload.discount_codes || [],
    note: payload.note,
    tags: payload.tags ? payload.tags.split(", ").filter(Boolean) : [],
    cancelled_at: payload.cancelled_at,
    closed_at: payload.closed_at,
    created_at_shopify: payload.created_at,
    updated_at_shopify: payload.updated_at,
    synced_at: new Date().toISOString(),
  };

  // Upsert the order
  const { data: order, error } = await supabase
    .from("orders")
    .upsert(orderData, {
      onConflict: "shop_id,shopify_order_id",
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error upserting order:", error);
    throw error;
  }

  // Link to customer if exists in our DB
  if (payload.customer?.id) {
    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("shop_id", shopId)
      .eq("shopify_customer_id", payload.customer.id)
      .single();

    if (customer) {
      await supabase
        .from("orders")
        .update({ customer_id: customer.id })
        .eq("id", order.id);
    }
  }

  // Emit realtime event
  const eventType = topic.replace("orders/", "order_");
  await emitRealtimeEvent(shopId, eventType, "order", order.id, shopifyOrderId, {
    order_number: payload.order_number,
    name: payload.name,
    total_price: payload.total_price,
    financial_status: payload.financial_status,
    fulfillment_status: payload.fulfillment_status,
    customer_email: payload.email,
  });

  console.log(`Processed ${topic} for order ${payload.name}`);
}

/**
 * Process product webhooks
 */
export async function processProductWebhook(
  shopId: string,
  topic: string,
  payload: any
) {
  const supabase = createAdminClient();
  const shopifyProductId = payload.id;

  if (topic === "products/delete") {
    // Delete the product from our DB
    const { data: product } = await supabase
      .from("products")
      .delete()
      .eq("shop_id", shopId)
      .eq("shopify_product_id", shopifyProductId)
      .select("id")
      .single();

    if (product) {
      await emitRealtimeEvent(
        shopId,
        "product_deleted",
        "product",
        product.id,
        shopifyProductId,
        { title: payload.title }
      );
    }
    return;
  }

  // Map Shopify product to our schema
  const productData = {
    shop_id: shopId,
    shopify_product_id: shopifyProductId,
    title: payload.title,
    description: payload.body_html,
    vendor: payload.vendor,
    product_type: payload.product_type,
    handle: payload.handle,
    status: payload.status,
    tags: payload.tags ? payload.tags.split(", ").filter(Boolean) : [],
    images: payload.images || [],
    options: payload.options || [],
    variants: payload.variants || [],
    created_at_shopify: payload.created_at,
    updated_at_shopify: payload.updated_at,
    synced_at: new Date().toISOString(),
  };

  const { data: product, error } = await supabase
    .from("products")
    .upsert(productData, {
      onConflict: "shop_id,shopify_product_id",
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error upserting product:", error);
    throw error;
  }

  // Emit realtime event
  const eventType = topic === "products/create" ? "product_created" : "product_updated";
  await emitRealtimeEvent(shopId, eventType, "product", product.id, shopifyProductId, {
    title: payload.title,
    status: payload.status,
    variants_count: payload.variants?.length || 0,
  });

  console.log(`Processed ${topic} for product ${payload.title}`);
}

/**
 * Process customer webhooks
 */
export async function processCustomerWebhook(
  shopId: string,
  topic: string,
  payload: any
) {
  const supabase = createAdminClient();
  const shopifyCustomerId = payload.id;

  if (topic === "customers/delete") {
    const { data: customer } = await supabase
      .from("customers")
      .delete()
      .eq("shop_id", shopId)
      .eq("shopify_customer_id", shopifyCustomerId)
      .select("id")
      .single();

    if (customer) {
      await emitRealtimeEvent(
        shopId,
        "customer_deleted",
        "customer",
        customer.id,
        shopifyCustomerId,
        { email: payload.email }
      );
    }
    return;
  }

  const customerData = {
    shop_id: shopId,
    shopify_customer_id: shopifyCustomerId,
    email: payload.email,
    first_name: payload.first_name,
    last_name: payload.last_name,
    phone: payload.phone,
    orders_count: payload.orders_count || 0,
    total_spent: parseFloat(payload.total_spent || "0"),
    currency: payload.currency,
    tags: payload.tags ? payload.tags.split(", ").filter(Boolean) : [],
    accepts_marketing: payload.accepts_marketing,
    default_address: payload.default_address,
    addresses: payload.addresses || [],
    created_at_shopify: payload.created_at,
    updated_at_shopify: payload.updated_at,
    synced_at: new Date().toISOString(),
  };

  const { data: customer, error } = await supabase
    .from("customers")
    .upsert(customerData, {
      onConflict: "shop_id,shopify_customer_id",
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error upserting customer:", error);
    throw error;
  }

  const eventType =
    topic === "customers/create" ? "customer_created" : "customer_updated";
  await emitRealtimeEvent(
    shopId,
    eventType,
    "customer",
    customer.id,
    shopifyCustomerId,
    {
      email: payload.email,
      name: `${payload.first_name || ""} ${payload.last_name || ""}`.trim(),
      orders_count: payload.orders_count,
    }
  );

  console.log(`Processed ${topic} for customer ${payload.email}`);
}

/**
 * Process inventory level webhooks
 */
export async function processInventoryWebhook(
  shopId: string,
  topic: string,
  payload: any
) {
  const supabase = createAdminClient();

  if (topic === "inventory_levels/disconnect") {
    await supabase
      .from("inventory_levels")
      .delete()
      .eq("shop_id", shopId)
      .eq("shopify_inventory_item_id", payload.inventory_item_id)
      .eq("shopify_location_id", payload.location_id);
    return;
  }

  // Get or create inventory item
  let { data: inventoryItem } = await supabase
    .from("inventory_items")
    .select("id")
    .eq("shop_id", shopId)
    .eq("shopify_inventory_item_id", payload.inventory_item_id)
    .single();

  if (!inventoryItem) {
    const { data: newItem, error } = await supabase
      .from("inventory_items")
      .insert({
        shop_id: shopId,
        shopify_inventory_item_id: payload.inventory_item_id,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating inventory item:", error);
      throw error;
    }
    inventoryItem = newItem;
  }

  // Get location name if we have it
  const { data: location } = await supabase
    .from("locations")
    .select("name")
    .eq("shop_id", shopId)
    .eq("shopify_location_id", payload.location_id)
    .single();

  // Upsert inventory level
  const { data: level, error } = await supabase
    .from("inventory_levels")
    .upsert(
      {
        shop_id: shopId,
        inventory_item_id: inventoryItem.id,
        shopify_inventory_item_id: payload.inventory_item_id,
        shopify_location_id: payload.location_id,
        location_name: location?.name || null,
        available: payload.available,
        synced_at: new Date().toISOString(),
      },
      {
        onConflict: "shop_id,shopify_inventory_item_id,shopify_location_id",
      }
    )
    .select("id")
    .single();

  if (error) {
    console.error("Error upserting inventory level:", error);
    throw error;
  }

  await emitRealtimeEvent(
    shopId,
    "inventory_updated",
    "inventory",
    level.id,
    payload.inventory_item_id,
    {
      inventory_item_id: payload.inventory_item_id,
      location_id: payload.location_id,
      available: payload.available,
    }
  );

  console.log(
    `Processed ${topic} for inventory item ${payload.inventory_item_id}`
  );
}
