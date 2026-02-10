import { shopifyApi, Session, ApiVersion } from "@shopify/shopify-api";
import "@shopify/shopify-api/adapters/web-api";

/**
 * Lazy-initialised Shopify API client.
 *
 * `shopifyApi()` throws when required env vars (`apiKey`, `apiSecretKey`)
 * are empty strings.  During Vercel's *build* step env vars are not
 * injected, so eagerly calling `shopifyApi()` at module scope crashes the
 * build.  Wrapping it in a getter defers initialisation to the first
 * runtime request, when env vars are available.
 */
let _shopify: ReturnType<typeof shopifyApi> | null = null;

function getShopify() {
  if (!_shopify) {
    _shopify = shopifyApi({
      apiKey: process.env.SHOPIFY_API_KEY!,
      apiSecretKey: process.env.SHOPIFY_API_SECRET!,
      scopes: [
        "read_products",
        "read_orders",
        "read_customers",
        "read_inventory",
        "read_locations",
      ],
      hostName: (process.env.HOST || "localhost:3000").replace(/https?:\/\//, ""),
      hostScheme: process.env.NODE_ENV === "production" ? "https" : "http",
      isEmbeddedApp: false,
      apiVersion: ApiVersion.October24,
    });
  }
  return _shopify;
}

/** Proxy that lazily initialises the Shopify client on first access. */
const shopify = new Proxy({} as ReturnType<typeof shopifyApi>, {
  get(_target, prop, receiver) {
    return Reflect.get(getShopify(), prop, receiver);
  },
});

export { shopify, Session, ApiVersion };
export type { Session as ShopifySession };
