import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pollOrder } from "@/lib/sms/order-lifecycle";

/**
 * SSE live OTP stream. Query: ?orderId=
 * Polls provider ~every 3s; auto-refunds after 5 min (order TTL).
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const orderId = req.nextUrl.searchParams.get("orderId");
  if (!orderId) return new Response("orderId required", { status: 400 });

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: session.user.id },
  });
  if (!order) return new Response("Not found", { status: 404 });

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      send({
        type: "connected",
        orderId,
        status: order.status,
        expiresAt: order.expiresAt,
        phoneNumber: order.phoneNumber,
      });

      const tick = async () => {
        if (closed) return "done";
        const result = await pollOrder(orderId);
        if (!result) {
          send({ type: "error", message: "missing" });
          return "done";
        }

        if (["RECEIVED", "CANCELLED", "REFUNDED", "EXPIRED"].includes(result.status)) {
          send({
            type: "otp",
            status: result.status,
            code: result.code,
            message: result.message,
            expiresAt: result.expiresAt,
            phoneNumber: result.phoneNumber,
          });
          return "done";
        }

        send({
          type: "wait",
          status: result.status,
          expiresAt: result.expiresAt,
          remainingMs: "remainingMs" in result ? result.remainingMs : undefined,
          phoneNumber: result.phoneNumber,
        });
        return "continue";
      };

      const interval = setInterval(async () => {
        try {
          const result = await tick();
          if (result === "done") {
            clearInterval(interval);
            try {
              controller.close();
            } catch {
              /* ignore */
            }
            closed = true;
          }
        } catch (e) {
          send({ type: "error", message: e instanceof Error ? e.message : "error" });
        }
      }, 3000);

      await tick();

      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
