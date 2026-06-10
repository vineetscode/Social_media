import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { NotificationService } from "@/modules/notification/services/notification.service";
import { syncUserWithDb } from "@/lib/auth-sync";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await syncUserWithDb(userId);

  try {
    const notifications = await NotificationService.getNotifications(userId, 30);
    return NextResponse.json(notifications);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await syncUserWithDb(userId);

  try {
    await NotificationService.markAllAsRead(userId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
