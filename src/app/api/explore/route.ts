import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ExploreService } from "@/modules/feed/services/explore.service";
import { syncUserWithDb } from "@/lib/auth-sync";

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Sync Clerk profile
    await syncUserWithDb(userId);

    const [posts, creators] = await Promise.all([
      ExploreService.getGlobalTrendingFeed(userId, 20),
      ExploreService.getPopularCreators(6),
    ]);

    return NextResponse.json({ posts, creators });
  } catch (error: any) {
    console.error("[GET /api/explore Error]", error);
    return NextResponse.json(
      { error: "Out of Service", message: "Sorry for the inconvenience. The system is temporarily offline." },
      { status: 503 }
    );
  }
}
