import { NextResponse } from "next/server";
import { runPiiRedaction } from "@/lib/pii/redact-old-orders";

/**
 * GET /api/cron/redact-pii
 *
 * PII redaction cron job. Scrubs personal information from orders
 * older than the most recent 100 per shop.
 *
 * Secured by CRON_SECRET — set this in Vercel env vars and configure
 * a Vercel Cron Job in vercel.json to hit this endpoint every 30 minutes.
 *
 * The cron job sends the CRON_SECRET via the Authorization header automatically.
 */
export async function GET(request: Request) {
  // Verify the request is from Vercel Cron or an authorized caller
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[Cron] CRON_SECRET env var is not set");
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runPiiRedaction();
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[Cron] PII redaction failed:", error);
    return NextResponse.json(
      {
        error: "Redaction failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
