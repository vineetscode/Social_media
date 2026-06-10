import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { FeedService } from "@/modules/feed/services/feed.service";
import { syncUserWithDb } from "@/lib/auth-sync";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Ensure user profile exists in database
  await syncUserWithDb(userId);

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "20");

  try {
    const posts = await FeedService.getRankedFeed(userId, limit);
    return NextResponse.json(posts);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
