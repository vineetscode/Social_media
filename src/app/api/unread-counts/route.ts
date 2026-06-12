import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { syncUserWithDb } from "@/lib/auth-sync";

export async function GET() {
  const startTotal = performance.now();
  let startQuery = 0;
  let endQuery = 0;
  let startAuth = 0;
  let endAuth = 0;
  let queryCount = 0;

  try {
    startAuth = performance.now();
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Sync Clerk profile
    await syncUserWithDb(userId);
    endAuth = performance.now();

    startQuery = performance.now();
    const [unreadNotifications, unreadMessages] = await Promise.all([
      prisma.notification.count({
        where: { recipientId: userId, isRead: false },
      }),
      prisma.message.count({
        where: { recipientId: userId, isRead: false },
      }),
    ]);
    queryCount += 2;
    endQuery = performance.now();

    const startSerialization = performance.now();
    const payload = {
      unreadNotifications,
      unreadMessages,
    };
    const responseBody = JSON.stringify(payload);
    const endSerialization = performance.now();

    const endTotal = performance.now();

    console.log(
      `[PERF LOG] GET /api/unread-counts | ` +
      `Total: ${(endTotal - startTotal).toFixed(2)}ms | ` +
      `Auth: ${(endAuth - startAuth).toFixed(2)}ms | ` +
      `Query: ${(endQuery - startQuery).toFixed(2)}ms (count: ${queryCount}) | ` +
      `Serialization: ${(endSerialization - startSerialization).toFixed(2)}ms`
    );

    return new NextResponse(responseBody, {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    const endTotal = performance.now();
    console.error(`[PERF LOG ERROR] GET /api/unread-counts | Total: ${(endTotal - startTotal).toFixed(2)}ms |`, error);
    return NextResponse.json(
      { error: "Out of Service", message: "Sorry for the inconvenience. The system is temporarily offline." },
      { status: 503 }
    );
  }
}
