import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ReelService } from "@/modules/post/services/reel.service";
import { syncUserWithDb } from "@/lib/auth-sync";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await syncUserWithDb(userId);

  try {
    const { reelId } = await request.json();
    if (!reelId) {
      return NextResponse.json({ error: "reelId is required" }, { status: 400 });
    }

    await ReelService.incrementViews(reelId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
