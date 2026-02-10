import { NextRequest, NextResponse } from "next/server";
import { verifyShopifyHmac } from "@/lib/shopify/verify-hmac";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/webhooks/shopify/customers-redact
 *
 * Shopify mandatory compliance webhook — "Customer data erasure".
 * Fired when a store owner requests deletion of customer data
 * on behalf of a customer (GDPR right to be forgotten).
 *
 * Configure in Partner Dashboard → App Setup → Compliance webhooks:
 *   Customer data erasure endpoint:
 *   https://seesawlive.com/api/webhooks/shopify/customers-redact
 *
 * Payload shape:
 * {
 *   "shop_id": 954889,
 *   "shop_domain": "shop.myshopify.com",
 *   "customer": { "id": 191167, "email": "john@example.com", "phone": "555-625-1199" },
 *   "orders_to_redact": [299938, 280263]
 * }
 */
export async function POST(request: NextRequest) {
  const rawBody = Buffer.from(await request.arrayBuffer());
  const hmac = request.headers.get("X-Shopify-Hmac-Sha256");

  if (!verifyShopifyHmac(rawBody, hmac)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return new NextResponse("Bad Request", { status: 400 });
  }

  const shopDomain = payload.shop_domain ?? "unknown";
  const customerId = payload.customer?.id;
  const customerEmail = payload.customer?.email;

  console.log(
    `[Compliance] customers/redact from ${shopDomain} for customer ${customerId}`
  );

  const supabase = createAdminClient();

  // Look up the shop in our database
  const { data: shop } = await supabase
    .from("shops")
    .select("id")
    .eq("shop_domain", shopDomain)
    .single();

  if (shop && customerId) {
    // Delete customer record
    await supabase
      .from("customers")
      .delete()
      .eq("shop_id", shop.id)
      .eq("shopify_customer_id", String(customerId));

    console.log(
      `[Compliance] Deleted customer ${customerId} data for shop ${shopDomain}`
    );
  }

  // Log the redaction for compliance auditing
  await supabase.from("webhook_logs").insert({
    shop_domain: shopDomain,
    topic: "customers/redact",
    payload: {
      shop_id: payload.shop_id,
      customer_id: customerId,
      customer_email: customerEmail,
      orders_to_redact: payload.orders_to_redact,
      redacted_at: new Date().toISOString(),
    },
  });

  return new NextResponse("OK", { status: 200 });
}
