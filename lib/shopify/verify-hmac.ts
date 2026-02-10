import crypto from "crypto";

/**
 * Verify Shopify webhook HMAC signature.
 *
 * Shopify signs the raw request body with the app's API secret using
 * HMAC-SHA256 and sends the signature as a base64-encoded string in
 * the X-Shopify-Hmac-Sha256 header.
 *
 * This function MUST receive the raw body bytes — never a re-serialised
 * JSON string — to ensure the digest matches.
 *
 * Reference: https://shopify.dev/docs/apps/build/webhooks/subscribe#verify-the-hmac
 */
export function verifyShopifyHmac(
  rawBody: Buffer,
  hmacHeader: string | null
): boolean {
  if (!hmacHeader || !process.env.SHOPIFY_API_SECRET) {
    return false;
  }

  const generatedHmac = crypto
    .createHmac("sha256", process.env.SHOPIFY_API_SECRET)
    .update(rawBody)
    .digest("base64");

  try {
    const receivedBuf = Buffer.from(hmacHeader, "base64");
    const generatedBuf = Buffer.from(generatedHmac, "base64");

    if (receivedBuf.length !== generatedBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(receivedBuf, generatedBuf);
  } catch {
    return false;
  }
}
