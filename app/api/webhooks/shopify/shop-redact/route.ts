import { NextRequest, NextResponse } from "next/server";
import { verifyShopifyHmac } from "@/lib/shopify/verify-hmac";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/webhooks/shopify/shop-redact
 *
 * Shopify mandatory compliance webhook — "Shop data erasure".
 * Fired 48 hours after a store uninstalls your app.
 * You must delete ALL data stored for that shop.
 *
 * Configure in Partner Dashboard → App Setup → Compliance webhooks:
 *   Shop data erasure endpoint:
 *   https://seesawlive.com/api/webhooks/shopify/shop-redact
 *
 * Payload shape:
 * {
 *   "shop_id": 954889,
 *   "shop_domain": "shop.myshopify.com"
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

  console.log(`[Compliance] shop/redact from ${shopDomain}`);

  const supabase = createAdminClient();

  // Look up the shop in our database
  const { data: shop } = await supabase
    .from("shops")
    .select("id")
    .eq("shop_domain", shopDomain)
    .single();

  if (shop) {
    // Delete all shop-related data in dependency order
    await supabase.from("orders").delete().eq("shop_id", shop.id);
    await supabase.from("customers").delete().eq("shop_id", shop.id);
    await supabase.from("products").delete().eq("shop_id", shop.id);
    await supabase.from("inventory_levels").delete().eq("shop_id", shop.id);
    await supabase.from("shop_users").delete().eq("shop_id", shop.id);
    await supabase
      .from("webhook_logs")
      .delete()
      .eq("shop_domain", shopDomain);
    await supabase.from("shops").delete().eq("id", shop.id);

    console.log(
      `[Compliance] All data deleted for shop ${shopDomain} (id=${shop.id})`
    );
  }

  // Log after deletion (use a fresh insert since we just deleted logs)
  await supabase.from("webhook_logs").insert({
    shop_domain: shopDomain,
    topic: "shop/redact",
    payload: {
      shop_id: payload.shop_id,
      redacted_at: new Date().toISOString(),
    },
  });

  return new NextResponse("OK", { status: 200 });
}
