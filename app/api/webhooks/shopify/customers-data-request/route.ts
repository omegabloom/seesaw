import { NextRequest, NextResponse } from "next/server";
import { verifyShopifyHmac } from "@/lib/shopify/verify-hmac";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/webhooks/shopify/customers-data-request
 *
 * Shopify mandatory compliance webhook — "Customer data request".
 * Fired when a customer requests their data from a store that has
 * your app installed.
 *
 * Configure in Partner Dashboard → App Setup → Compliance webhooks:
 *   Customer data request endpoint:
 *   https://seesawlive.com/api/webhooks/shopify/customers-data-request
 *
 * Payload shape:
 * {
 *   "shop_id": 954889,
 *   "shop_domain": "shop.myshopify.com",
 *   "orders_requested": [299938, 280263, ...],
 *   "customer": { "id": 191167, "email": "john@example.com", "phone": "555-625-1199" },
 *   "data_request": { "id": 9999 }
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
  const customerEmail = payload.customer?.email;
  const customerId = payload.customer?.id;

  console.log(
    `[Compliance] customers/data_request from ${shopDomain} for customer ${customerId}`
  );

  const supabase = createAdminClient();

  // Log the data request for compliance auditing
  await supabase.from("webhook_logs").insert({
    shop_domain: shopDomain,
    topic: "customers/data_request",
    payload: {
      shop_id: payload.shop_id,
      customer_id: customerId,
      customer_email: customerEmail,
      orders_requested: payload.orders_requested,
      data_request_id: payload.data_request?.id,
      received_at: new Date().toISOString(),
      note: "App stores order analytics only — minimal PII.",
    },
  });

  // Shopify expects 200 within 5 seconds
  return new NextResponse("OK", { status: 200 });
}
