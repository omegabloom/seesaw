import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Shopify Mandatory Compliance Webhooks
 *
 * This single endpoint handles all three mandatory GDPR/compliance webhooks:
 *   - customers/data_request
 *   - customers/redact
 *   - shop/redact
 *
 * Configure these URLs in Shopify Partner Dashboard → App Setup → Compliance webhooks:
 *   Customer data request endpoint:  https://seesawlive.com/api/webhooks/shopify/compliance
 *   Customer data erasure endpoint:  https://seesawlive.com/api/webhooks/shopify/compliance
 *   Shop data erasure endpoint:      https://seesawlive.com/api/webhooks/shopify/compliance
 */

/**
 * Validate Shopify webhook HMAC over raw request bytes.
 */
function validateHmac(rawBody: Buffer, hmac: string | null): boolean {
  if (!hmac || !process.env.SHOPIFY_API_SECRET) return false;

  const generatedHmac = crypto
    .createHmac("sha256", process.env.SHOPIFY_API_SECRET)
    .update(rawBody)
    .digest("base64");

  try {
    const receivedBuf = Buffer.from(hmac, "base64");
    const generatedBuf = Buffer.from(generatedHmac, "base64");

    if (receivedBuf.length !== generatedBuf.length) return false;

    return crypto.timingSafeEqual(receivedBuf, generatedBuf);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const rawBodyBuffer = Buffer.from(await request.arrayBuffer());

  const hmac = request.headers.get("X-Shopify-Hmac-Sha256");
  const topic = request.headers.get("X-Shopify-Topic");

  // Validate HMAC — reject if signature is missing or invalid
  if (!validateHmac(rawBodyBuffer, hmac)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const rawBody = rawBodyBuffer.toString("utf8");

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new NextResponse("Bad Request", { status: 400 });
  }

  const shopDomain = payload.shop_domain || "unknown";
  const supabase = createAdminClient();

  // Log the compliance request
  await supabase.from("webhook_logs").insert({
    shop_domain: shopDomain,
    topic: topic || "compliance",
    payload,
  });

  console.log(`[Compliance] ${topic} received for ${shopDomain}`);

  switch (topic) {
    // -------------------------------------------------------
    // customers/data_request
    // A customer has requested their data. Respond with the
    // data you have stored, or acknowledge that you will email
    // the merchant with the data within 30 days.
    // -------------------------------------------------------
    case "customers/data_request": {
      const customerEmail = payload?.customer?.email;
      const shopId = payload?.shop_id;

      console.log(
        `[Compliance] Customer data request – shop=${shopDomain} customer=${customerEmail}`
      );

      // We store order-level data tied to shops, not individual PII beyond
      // what Shopify already surfaces. Log the request for manual follow-up.
      if (customerEmail) {
        await supabase.from("webhook_logs").insert({
          shop_domain: shopDomain,
          topic: "compliance/data_request",
          payload: {
            customer_email: customerEmail,
            shop_id: shopId,
            requested_at: new Date().toISOString(),
            note: "Customer data request received. App stores minimal PII — order analytics only.",
          },
        });
      }
      break;
    }

    // -------------------------------------------------------
    // customers/redact
    // A customer has requested erasure of their data.
    // Delete any personal data you have stored for this customer.
    // -------------------------------------------------------
    case "customers/redact": {
      const customerEmail = payload?.customer?.email;
      const customerId = payload?.customer?.id;
      const shopId = payload?.shop_id;

      console.log(
        `[Compliance] Customer redact – shop=${shopDomain} customer_id=${customerId}`
      );

      // Look up the shop in our database
      const { data: shop } = await supabase
        .from("shops")
        .select("id")
        .eq("shop_domain", shopDomain)
        .single();

      if (shop && customerId) {
        // Remove customer records associated with this Shopify customer ID
        const { error } = await supabase
          .from("customers")
          .delete()
          .eq("shop_id", shop.id)
          .eq("shopify_customer_id", String(customerId));

        if (error) {
          console.error("[Compliance] Error deleting customer data:", error);
        } else {
          console.log(
            `[Compliance] Deleted customer data for customer_id=${customerId}`
          );
        }
      }

      // Log the redaction
      await supabase.from("webhook_logs").insert({
        shop_domain: shopDomain,
        topic: "compliance/customer_redacted",
        payload: {
          customer_id: customerId,
          customer_email: customerEmail,
          shop_id: shopId,
          redacted_at: new Date().toISOString(),
        },
      });
      break;
    }

    // -------------------------------------------------------
    // shop/redact
    // Within 48 hours of a store uninstalling your app,
    // Shopify sends this webhook. Delete all data associated
    // with that shop.
    // -------------------------------------------------------
    case "shop/redact": {
      const shopId = payload?.shop_id;

      console.log(
        `[Compliance] Shop redact – shop=${shopDomain} shopify_shop_id=${shopId}`
      );

      // Look up the shop in our database
      const { data: shop } = await supabase
        .from("shops")
        .select("id")
        .eq("shop_domain", shopDomain)
        .single();

      if (shop) {
        // Delete all shop-related data in dependency order
        // 1. Delete orders
        await supabase.from("orders").delete().eq("shop_id", shop.id);

        // 2. Delete customers
        await supabase.from("customers").delete().eq("shop_id", shop.id);

        // 3. Delete products
        await supabase.from("products").delete().eq("shop_id", shop.id);

        // 4. Delete inventory levels
        await supabase.from("inventory_levels").delete().eq("shop_id", shop.id);

        // 5. Delete shop_users links
        await supabase.from("shop_users").delete().eq("shop_id", shop.id);

        // 6. Delete webhook logs for this shop
        await supabase
          .from("webhook_logs")
          .delete()
          .eq("shop_domain", shopDomain);

        // 7. Delete the shop record itself
        await supabase.from("shops").delete().eq("id", shop.id);

        console.log(
          `[Compliance] All data deleted for shop=${shopDomain} (id=${shop.id})`
        );
      }

      break;
    }

    default:
      console.log(`[Compliance] Unknown topic: ${topic}`);
  }

  // Shopify expects a 200 response
  return new NextResponse("OK", { status: 200 });
}
