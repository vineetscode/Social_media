import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { StoryService } from "@/modules/post/services/story.service";
import { syncUserWithDb } from "@/lib/auth-sync";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await syncUserWithDb(userId);

  try {
    const { storyId } = await request.json();
    if (!storyId) {
      return NextResponse.json({ error: "storyId is required" }, { status: 400 });
    }

    await StoryService.viewStory(userId, storyId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
