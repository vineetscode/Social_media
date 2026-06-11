import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { syncUserWithDb } from "@/lib/auth-sync";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Sync Clerk profile
  await syncUserWithDb(userId);

  try {
    const [unreadNotifications, unreadMessages] = await Promise.all([
      prisma.notification.count({
        where: { recipientId: userId, isRead: false },
      }),
      prisma.message.count({
        where: { recipientId: userId, isRead: false },
      }),
    ]);

    return NextResponse.json({
      unreadNotifications,
      unreadMessages,
    });
  } catch (error: any) {
    console.error("[GET /api/unread-counts Error]", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
