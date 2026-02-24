import { createHmac } from "crypto";
import { prisma } from "@/lib/db";
import type { WebhookEvent } from "@/app/generated/prisma/client";

interface WebhookPayload {
  event: WebhookEvent;
  data: Record<string, any>;
  timestamp: string;
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export async function dispatchWebhooks(
  userId: string,
  event: WebhookEvent,
  data: Record<string, any>,
  orgId?: string,
) {
  try {
    // Find all active webhooks for this user/org that subscribe to this event
    const webhooks = await prisma.webhook.findMany({
      where: {
        isActive: true,
        events: { has: event },
        OR: [
          { userId },
          ...(orgId ? [{ orgId }] : []),
        ],
      },
    });

    if (webhooks.length === 0) return;

    const timestamp = new Date().toISOString();
    const payload: WebhookPayload = { event, data, timestamp };
    const payloadStr = JSON.stringify(payload);

    // Fire webhooks in parallel (fire-and-forget)
    const deliveries = webhooks.map(async (webhook) => {
      const signature = signPayload(payloadStr, webhook.secret);

      try {
        const response = await fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-GudCal-Signature": signature,
            "X-GudCal-Event": event,
            "X-GudCal-Timestamp": timestamp,
          },
          body: payloadStr,
          signal: AbortSignal.timeout(10000), // 10s timeout
        });

        if (!response.ok) {
          console.error(
            `Webhook delivery failed: ${webhook.url} returned ${response.status}`,
          );
        }
      } catch (error) {
        console.error(`Webhook delivery error for ${webhook.url}:`, error);
      }
    });

    await Promise.allSettled(deliveries);
  } catch (error) {
    console.error("Webhook dispatch error:", error);
  }
}
