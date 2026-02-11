import { createAdminClient } from "@/lib/supabase/admin";

/**
 * PII Redaction for Orders
 *
 * Keeps PII (email, name, addresses, note) only on the latest 100 orders
 * per shop. Older orders get their PII scrubbed while retaining analytics
 * data (totals, line_items product info, currency, statuses, timestamps,
 * lat/lng for globe view).
 *
 * Designed to run on a 30-minute cron schedule.
 *
 * What gets redacted on orders:
 *   - email → null
 *   - shipping_address → keeps only city, province, province_code, country,
 *     country_code (needed for globe labels and slow-mover destination).
 *     Removes name, address1, address2, phone, zip, company.
 *   - billing_address → null
 *   - note → null
 *
 * What gets redacted on linked customers (beyond the 100-order window):
 *   - email, first_name, last_name, phone → null
 *   - default_address, addresses → null
 *
 * What is preserved:
 *   - order_number, name (e.g. "#1001"), shopify_order_id
 *   - financial_status, fulfillment_status, total_price, currency, line_items
 *   - shipping_latitude, shipping_longitude (for globe pins)
 *   - shipping_address.city/province/country (for location labels)
 *   - created_at_shopify, all timestamps
 *   - tags, discount_codes
 */

const KEEP_RECENT = 100; // Number of recent orders to keep PII on per shop
const BATCH_SIZE = 200; // Max orders to redact per batch per shop

/**
 * Strip PII from a shipping address, keeping only geographic fields
 * needed by the globe and slow-mover views.
 */
function redactShippingAddress(address: any): object | null {
  if (!address) return null;
  return {
    city: address.city || null,
    province: address.province || null,
    province_code: address.province_code || null,
    country: address.country || null,
    country_code: address.country_code || null,
  };
}

export async function runPiiRedaction(): Promise<{
  shopsProcessed: number;
  ordersRedacted: number;
  customersRedacted: number;
  errors: string[];
}> {
  const supabase = createAdminClient();
  let totalOrdersRedacted = 0;
  let totalCustomersRedacted = 0;
  const errors: string[] = [];

  // Get all active shops
  const { data: shops, error: shopsError } = await supabase
    .from("shops")
    .select("id, shop_domain")
    .eq("is_active", true);

  if (shopsError || !shops) {
    console.error("[PII Redaction] Failed to fetch shops:", shopsError);
    return { shopsProcessed: 0, ordersRedacted: 0, customersRedacted: 0, errors: [shopsError?.message || "No shops found"] };
  }

  console.log(`[PII Redaction] Processing ${shops.length} active shops`);

  for (const shop of shops) {
    try {
      // ------------------------------------------------------------------
      // Step 1: Find the created_at_shopify cutoff for the 100th most recent order
      // ------------------------------------------------------------------
      const { data: cutoffOrder, error: cutoffError } = await supabase
        .from("orders")
        .select("created_at_shopify")
        .eq("shop_id", shop.id)
        .order("created_at_shopify", { ascending: false })
        .range(KEEP_RECENT - 1, KEEP_RECENT - 1) // 0-indexed, so index 99 = 100th order
        .single();

      if (cutoffError || !cutoffOrder) {
        // Fewer than 100 orders — nothing to redact
        console.log(`[PII Redaction] Shop ${shop.shop_domain}: <${KEEP_RECENT} orders, skipping`);
        continue;
      }

      const cutoffDate = cutoffOrder.created_at_shopify;

      // ------------------------------------------------------------------
      // Step 2: Fetch orders older than cutoff that haven't been redacted yet
      // ------------------------------------------------------------------
      const { data: staleOrders, error: fetchError } = await supabase
        .from("orders")
        .select("id, shipping_address, customer_id")
        .eq("shop_id", shop.id)
        .eq("pii_redacted", false)
        .lt("created_at_shopify", cutoffDate)
        .order("created_at_shopify", { ascending: true })
        .limit(BATCH_SIZE);

      if (fetchError) {
        console.error(`[PII Redaction] Error fetching orders for ${shop.shop_domain}:`, fetchError);
        errors.push(`${shop.shop_domain}: ${fetchError.message}`);
        continue;
      }

      if (!staleOrders || staleOrders.length === 0) {
        console.log(`[PII Redaction] Shop ${shop.shop_domain}: no un-redacted orders beyond top ${KEEP_RECENT}`);
        continue;
      }

      console.log(`[PII Redaction] Shop ${shop.shop_domain}: redacting ${staleOrders.length} orders`);

      // ------------------------------------------------------------------
      // Step 3: Redact each order
      // ------------------------------------------------------------------
      const orderIds = staleOrders.map((o) => o.id);
      const customerIdsToCheck = new Set<string>();

      // Collect customer IDs for later redaction check
      for (const order of staleOrders) {
        if (order.customer_id) {
          customerIdsToCheck.add(order.customer_id);
        }
      }

      // Batch update: redact PII fields on all stale orders
      // We need to update each order individually because shipping_address
      // redaction depends on the existing value
      for (const order of staleOrders) {
        const { error: updateError } = await supabase
          .from("orders")
          .update({
            email: null,
            shipping_address: redactShippingAddress(order.shipping_address),
            billing_address: null,
            note: null,
            pii_redacted: true,
          })
          .eq("id", order.id);

        if (updateError) {
          errors.push(`Order ${order.id}: ${updateError.message}`);
        } else {
          totalOrdersRedacted++;
        }
      }

      // ------------------------------------------------------------------
      // Step 4: Redact customers who have NO recent (non-redacted) orders
      // ------------------------------------------------------------------
      for (const customerId of customerIdsToCheck) {
        // Check if this customer still has any non-redacted orders
        const { count } = await supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("shop_id", shop.id)
          .eq("customer_id", customerId)
          .eq("pii_redacted", false);

        if (count === 0) {
          // All orders for this customer are redacted — redact customer PII too
          const { error: custError } = await supabase
            .from("customers")
            .update({
              email: null,
              first_name: null,
              last_name: null,
              phone: null,
              default_address: null,
              addresses: "[]",
              pii_redacted: true,
            })
            .eq("id", customerId)
            .eq("pii_redacted", false); // Don't re-redact

          if (custError) {
            errors.push(`Customer ${customerId}: ${custError.message}`);
          } else {
            totalCustomersRedacted++;
          }
        }
      }

      console.log(
        `[PII Redaction] Shop ${shop.shop_domain}: redacted ${staleOrders.length} orders, checked ${customerIdsToCheck.size} customers`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error(`[PII Redaction] Error processing ${shop.shop_domain}:`, msg);
      errors.push(`${shop.shop_domain}: ${msg}`);
    }
  }

  const result = {
    shopsProcessed: shops.length,
    ordersRedacted: totalOrdersRedacted,
    customersRedacted: totalCustomersRedacted,
    errors,
  };

  console.log("[PII Redaction] Complete:", result);
  return result;
}
