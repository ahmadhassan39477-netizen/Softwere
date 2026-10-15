import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getSmsProvider } from "@/lib/providers/sms";
import { creditWallet } from "@/lib/wallet";

type Ctx = { params: Promise<{ orderId: string }> };

/** SSE stream for live OTP inbox updates (falls back to client polling if blocked). */
export async function GET(req: NextRequest, ctx: Ctx) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { orderId } = await ctx.params;
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

      send({ type: "connected", orderId, status: order.status, expiresAt: order.expiresAt });

      const tick = async () => {
        if (closed) return;
        const current = await prisma.order.findUnique({ where: { id: orderId } });
        if (!current) {
          send({ type: "error", message: "missing" });
          return;
        }

        if (["RECEIVED", "CANCELLED", "REFUNDED", "EXPIRED"].includes(current.status)) {
          send({
            type: "otp",
            status: current.status,
            code: current.otpCode,
            message: current.otpMessage,
            expiresAt: current.expiresAt,
          });
          return "done";
        }

        if (current.expiresAt.getTime() < Date.now()) {
          await prisma.order.update({
            where: { id: current.id },
            data: { status: "REFUNDED", refundedAt: new Date() },
          });
          await creditWallet(session.user.id, current.price, {
            type: "REFUND",
            method: "system",
            externalId: current.id,
            meta: JSON.stringify({ reason: "expired_no_otp" }),
          });
          send({ type: "otp", status: "REFUNDED", code: null, expiresAt: current.expiresAt });
          return "done";
        }

        if (current.providerOrderId) {
          const otp = await getSmsProvider(current.providerKey).getOtp(current.providerOrderId);
          if (otp.status === "RECEIVED" && otp.code) {
            await prisma.order.update({
              where: { id: current.id },
              data: { status: "RECEIVED", otpCode: otp.code, otpMessage: otp.message },
            });
            send({
              type: "otp",
              status: "RECEIVED",
              code: otp.code,
              message: otp.message,
              expiresAt: current.expiresAt,
            });
            return "done";
          }
        }

        send({
          type: "wait",
          status: current.status,
          expiresAt: current.expiresAt,
          remainingMs: current.expiresAt.getTime() - Date.now(),
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
      }, 2000);

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
