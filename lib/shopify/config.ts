import { shopifyApi, Session, ApiVersion } from "@shopify/shopify-api";
import "@shopify/shopify-api/adapters/web-api";

// Validate required environment variables
if (!process.env.SHOPIFY_API_KEY) {
  console.warn("Missing SHOPIFY_API_KEY environment variable");
}
if (!process.env.SHOPIFY_API_SECRET) {
  console.warn("Missing SHOPIFY_API_SECRET environment variable");
}

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY || "",
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  scopes: [
    "read_products",
    "read_orders",
    "read_customers",
    "read_inventory",
    "read_locations",
  ],
  hostName: (process.env.HOST || "localhost:3000").replace(/https?:\/\//, ""),
  hostScheme: process.env.NODE_ENV === "production" ? "https" : "http",
  isEmbeddedApp: false, // External app, not embedded in Shopify Admin
  apiVersion: ApiVersion.October24,
});

export { shopify, Session, ApiVersion };
export type { Session as ShopifySession };
