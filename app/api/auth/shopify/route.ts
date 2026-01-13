import { NextRequest, NextResponse } from "next/server";
import { shopify } from "@/lib/shopify/config";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const shop = searchParams.get("shop");
  const confirmed = searchParams.get("confirmed");

  // Check if user is authenticated
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Redirect to sign in, preserving the shop parameter
    const signInUrl = new URL("/sign-in", request.url);
    if (shop) {
      signInUrl.searchParams.set("redirect", `/api/auth/shopify?shop=${shop}`);
    }
    return NextResponse.redirect(signInUrl);
  }

  if (!shop) {
    return NextResponse.json(
      { error: "Missing shop parameter. Use ?shop=your-store.myshopify.com" },
      { status: 400 }
    );
  }

  // Validate shop domain format
  const shopRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;
  if (!shopRegex.test(shop)) {
    return NextResponse.json(
      {
        error:
          "Invalid shop domain format. Expected: your-store.myshopify.com",
      },
      { status: 400 }
    );
  }

  // Check if shop already exists and user hasn't confirmed
  if (confirmed !== "true") {
    const adminSupabase = createAdminClient();
    const { data: existingShop } = await adminSupabase
      .from("shops")
      .select("id, shop_domain, shop_name, is_active")
      .eq("shop_domain", shop)
      .eq("is_active", true)
      .single();

    if (existingShop) {
      // Check if user is already connected to this shop
      const { data: existingLink } = await adminSupabase
        .from("shop_users")
        .select("id")
        .eq("user_id", user.id)
        .eq("shop_id", existingShop.id)
        .single();

      if (!existingLink) {
        // Shop exists but user isn't connected - redirect to confirmation page
        const confirmUrl = new URL("/dashboard/connect/confirm", request.url);
        confirmUrl.searchParams.set("shop", shop);
        if (existingShop.shop_name) {
          confirmUrl.searchParams.set("name", existingShop.shop_name);
        }
        return NextResponse.redirect(confirmUrl);
      }
    }
  }

  try {
    // Generate a random state for CSRF protection
    const state = crypto.randomUUID();

    // Store state in a cookie for validation in callback
    const scopes = shopify.config.scopes?.toString() || "read_products,read_orders,read_customers,read_inventory,read_locations";
    const response = NextResponse.redirect(
      `https://${shop}/admin/oauth/authorize?` +
        new URLSearchParams({
          client_id: process.env.SHOPIFY_API_KEY!,
          scope: scopes,
          redirect_uri: `${process.env.HOST}/api/auth/shopify/callback`,
          state: state,
        }).toString()
    );

    // Set state cookie (httpOnly, secure in production)
    response.cookies.set("shopify_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10, // 10 minutes
      path: "/",
    });

    // Store the shop domain for callback
    response.cookies.set("shopify_oauth_shop", shop, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Shopify OAuth begin error:", error);
    return NextResponse.json(
      { error: "Failed to initiate Shopify OAuth" },
      { status: 500 }
    );
  }
}
