import prisma from "@/lib/prisma";

export class Analytics {
  // Server-side direct DB logging
  static async track(userId: string | null, eventType: string, payload: any = {}) {
    try {
      // Run as non-blocking background query
      prisma.analyticsEvent.create({
        data: {
          userId,
          eventType,
          payload,
        },
      }).catch((e) => console.error("[ANALYTICS DB ERROR]", e));
      
      console.log(`[ANALYTICS LOG] Event: "${eventType}" | User: ${userId || "anonymous"}`);
    } catch (err) {
      console.error("[ANALYTICS ERROR] Logging failed:", err);
    }
  }

  // Client-side dispatcher to API route
  static async trackClient(eventType: string, payload: any = {}) {
    try {
      await fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType, payload }),
      });
    } catch (err) {
      console.error("[CLIENT ANALYTICS ERROR] Dispatch failed:", err);
    }
  }
}
