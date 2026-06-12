import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { FeedService } from "@/modules/feed/services/feed.service";
import { syncUserWithDb } from "@/lib/auth-sync";

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure user profile exists in database
    await syncUserWithDb(userId);

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const cursor = searchParams.get("cursor") || undefined;

    const result = await FeedService.getRankedFeed(userId, limit, cursor);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[GET /api/feed Error]", error);
    return NextResponse.json(
      { error: "Out of Service", message: "Sorry for the inconvenience. The system is temporarily offline." },
      { status: 503 }
    );
  }
}
