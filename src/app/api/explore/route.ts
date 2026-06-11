import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ExploreService } from "@/modules/feed/services/explore.service";
import { syncUserWithDb } from "@/lib/auth-sync";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Sync Clerk profile
  await syncUserWithDb(userId);

  try {
    const [posts, creators] = await Promise.all([
      ExploreService.getGlobalTrendingFeed(userId, 20),
      ExploreService.getPopularCreators(6),
    ]);

    return NextResponse.json({ posts, creators });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
