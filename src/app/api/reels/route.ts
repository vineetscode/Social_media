import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ReelService } from "@/modules/post/services/reel.service";
import { syncUserWithDb } from "@/lib/auth-sync";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await syncUserWithDb(userId);

  try {
    const reels = await ReelService.getReels(15);
    return NextResponse.json(reels);
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
    const { caption, mediaUrl } = await request.json();
    if (!mediaUrl) {
      return NextResponse.json({ error: "mediaUrl is required" }, { status: 400 });
    }

    const reel = await ReelService.createReel(userId, caption, mediaUrl);
    return NextResponse.json(reel);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
