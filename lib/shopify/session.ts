import { shopify } from "./config";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ShopData {
  id: string;
  shop_domain: string;
  shopify_shop_id: bigint | null;
  access_token: string;
  scope: string;
  shop_name: string | null;
  shop_email: string | null;
  currency: string;
  timezone: string | null;
  is_active: boolean;
}

/**
 * Store or update a Shopify session in the database
 */
export async function storeShopifySession(
  shopDomain: string,
  accessToken: string,
  scope: string,
  shopData?: {
    shopify_shop_id?: bigint;
    shop_name?: string;
    shop_email?: string;
    currency?: string;
    timezone?: string;
  }
): Promise<ShopData> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("shops")
    .upsert(
      {
        shop_domain: shopDomain,
        access_token: accessToken,
        scope: scope,
        is_active: true,
        installed_at: new Date().toISOString(),
        uninstalled_at: null,
        ...shopData,
      },
      {
        onConflict: "shop_domain",
      }
    )
    .select()
    .single();

  if (error) {
    console.error("Error storing Shopify session:", error);
    throw new Error(`Failed to store Shopify session: ${error.message}`);
  }

  return data as ShopData;
}

/**
 * Get shop data by domain
 */
export async function getShopByDomain(
  shopDomain: string
): Promise<ShopData | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("shops")
    .select("*")
    .eq("shop_domain", shopDomain)
    .eq("is_active", true)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // No rows found
    }
    console.error("Error getting shop:", error);
    throw new Error(`Failed to get shop: ${error.message}`);
  }

  return data as ShopData;
}

/**
 * Get shop data by ID
 */
export async function getShopById(shopId: string): Promise<ShopData | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("shops")
    .select("*")
    .eq("id", shopId)
    .eq("is_active", true)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    console.error("Error getting shop by ID:", error);
    throw new Error(`Failed to get shop: ${error.message}`);
  }

  return data as ShopData;
}

/**
 * Link a Supabase user to a shop
 */
export async function linkUserToShop(
  userId: string,
  shopId: string,
  role: "owner" | "admin" | "member" = "owner",
  isDefault: boolean = true
): Promise<void> {
  const supabase = createAdminClient();

  // If this is the default shop, unset other defaults first
  if (isDefault) {
    await supabase
      .from("shop_users")
      .update({ is_default: false })
      .eq("user_id", userId);
  }

  const { error } = await supabase.from("shop_users").upsert(
    {
      user_id: userId,
      shop_id: shopId,
      role,
      is_default: isDefault,
    },
    {
      onConflict: "user_id,shop_id",
    }
  );

  if (error) {
    console.error("Error linking user to shop:", error);
    throw new Error(`Failed to link user to shop: ${error.message}`);
  }
}

/**
 * Mark a shop as uninstalled
 */
export async function markShopUninstalled(shopDomain: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("shops")
    .update({
      is_active: false,
      uninstalled_at: new Date().toISOString(),
    })
    .eq("shop_domain", shopDomain);

  if (error) {
    console.error("Error marking shop uninstalled:", error);
    throw new Error(`Failed to mark shop uninstalled: ${error.message}`);
  }
}

/**
 * Get all shops for a user
 */
export async function getUserShops(userId: string): Promise<ShopData[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("shop_users")
    .select(
      `
      shop_id,
      role,
      is_default,
      shops (*)
    `
    )
    .eq("user_id", userId);

  if (error) {
    console.error("Error getting user shops:", error);
    throw new Error(`Failed to get user shops: ${error.message}`);
  }

  return (data || [])
    .filter((item: any) => item.shops?.is_active)
    .map((item: any) => ({
      ...item.shops,
      role: item.role,
      is_default: item.is_default,
    }));
}

/**
 * Create a Shopify GraphQL client for a shop
 */
export function createShopifyClient(shopDomain: string, accessToken: string) {
  const session = {
    shop: shopDomain,
    accessToken: accessToken,
  };

  return new shopify.clients.Graphql({ session: session as any });
}

/**
 * Create a Shopify REST client for a shop
 */
export function createShopifyRestClient(
  shopDomain: string,
  accessToken: string
) {
  const session = {
    shop: shopDomain,
    accessToken: accessToken,
  };

  return new shopify.clients.Rest({ session: session as any });
}
