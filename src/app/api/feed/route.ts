import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { FeedService } from "@/modules/feed/services/feed.service";
import { syncUserWithDb } from "@/lib/auth-sync";

export async function GET(request: Request) {
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

    // Ensure user profile exists in database
    await syncUserWithDb(userId);
    endAuth = performance.now();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const cursor = searchParams.get("cursor") || undefined;

    startQuery = performance.now();
    // 1 query to get followings + 1 query to fetch posts (with includes)
    const result = await FeedService.getRankedFeed(userId, limit, cursor);
    queryCount += 2;
    endQuery = performance.now();

    const startSerialization = performance.now();
    const responseBody = JSON.stringify(result);
    const endSerialization = performance.now();

    const endTotal = performance.now();

    console.log(
      `[PERF LOG] GET /api/feed | ` +
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
    console.error(`[PERF LOG ERROR] GET /api/feed | Total: ${(endTotal - startTotal).toFixed(2)}ms |`, error);
    return NextResponse.json(
      { error: "Out of Service", message: "Sorry for the inconvenience. The system is temporarily offline." },
      { status: 503 }
    );
  }
}
