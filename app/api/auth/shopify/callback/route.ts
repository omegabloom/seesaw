import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { storeShopifySession, linkUserToShop } from "@/lib/shopify/session";
import { createClient } from "@/lib/supabase/server";
import { triggerInitialSync } from "@/lib/shopify/sync";
import { registerWebhooks } from "@/lib/shopify/webhooks";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const shop = searchParams.get("shop");
  const hmac = searchParams.get("hmac");

  // Get stored state and shop from cookies
  const storedState = request.cookies.get("shopify_oauth_state")?.value;
  const storedShop = request.cookies.get("shopify_oauth_shop")?.value;

  const appUrl = process.env.HOST || request.url;

  // Validate required parameters
  if (!code || !state || !shop || !hmac) {
    return NextResponse.redirect(
      new URL(
        "/dashboard?error=missing_params&message=Missing OAuth parameters",
        appUrl
      )
    );
  }

  // Validate state (CSRF protection)
  if (state !== storedState) {
    return NextResponse.redirect(
      new URL(
        "/dashboard?error=invalid_state&message=Invalid OAuth state",
        appUrl
      )
    );
  }

  // Validate shop matches
  if (shop !== storedShop) {
    return NextResponse.redirect(
      new URL(
        "/dashboard?error=shop_mismatch&message=Shop domain mismatch",
        appUrl
      )
    );
  }

  // Validate HMAC
  const queryParams = new URLSearchParams(searchParams);
  queryParams.delete("hmac");
  queryParams.sort();

  const message = queryParams.toString();
  const generatedHmac = crypto
    .createHmac("sha256", process.env.SHOPIFY_API_SECRET!)
    .update(message)
    .digest("hex");

  if (
    !crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(generatedHmac))
  ) {
    return NextResponse.redirect(
      new URL(
        "/dashboard?error=invalid_hmac&message=Invalid HMAC signature",
        appUrl
      )
    );
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch(
      `https://${shop}/admin/oauth/access_token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: process.env.SHOPIFY_API_KEY,
          client_secret: process.env.SHOPIFY_API_SECRET,
          code: code,
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", errorText);
      return NextResponse.redirect(
        new URL(
          "/dashboard?error=token_exchange&message=Failed to get access token",
          request.url
        )
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const scope = tokenData.scope;

    // Fetch shop info from Shopify
    const shopInfoResponse = await fetch(
      `https://${shop}/admin/api/2024-10/shop.json`,
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
        },
      }
    );

    let shopInfo: any = {};
    if (shopInfoResponse.ok) {
      const shopData = await shopInfoResponse.json();
      shopInfo = {
        shopify_shop_id: shopData.shop.id,
        shop_name: shopData.shop.name,
        shop_email: shopData.shop.email,
        currency: shopData.shop.currency,
        timezone: shopData.shop.iana_timezone,
      };
    }

    // Store the session in Supabase
    const shopRecord = await storeShopifySession(
      shop,
      accessToken,
      scope,
      shopInfo
    );

    // Get current user and link them to the shop
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await linkUserToShop(user.id, shopRecord.id, "owner", true);
    }

    // Register webhooks with Shopify
    try {
      const webhookResult = await registerWebhooks(shopRecord.id, shop, accessToken);
      console.log(`Webhooks registered for shop: ${shop}`, webhookResult);
    } catch (webhookError) {
      console.error("Failed to register webhooks:", webhookError);
      // Don't fail the OAuth flow, just log the error
    }

    // Clear OAuth cookies
    const response = NextResponse.redirect(
      new URL(
        `/dashboard?success=true&shop=${encodeURIComponent(shop)}`,
        appUrl
      )
    );
    response.cookies.delete("shopify_oauth_state");
    response.cookies.delete("shopify_oauth_shop");

    // Trigger initial sync in the background (don't await)
    triggerInitialSync(shopRecord.id).catch((err) =>
      console.error("Initial sync error:", err)
    );

    return response;
  } catch (error) {
    console.error("Shopify OAuth callback error:", error);
    return NextResponse.redirect(
      new URL(
        "/dashboard?error=callback_error&message=OAuth callback failed",
        appUrl
      )
    );
  }
}
