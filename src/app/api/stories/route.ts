import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { StoryService } from "@/modules/post/services/story.service";
import { syncUserWithDb } from "@/lib/auth-sync";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await syncUserWithDb(userId);

  try {
    const activeStories = await StoryService.getActiveStoriesForUser(userId);
    return NextResponse.json(activeStories);
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
    const { mediaUrl } = await request.json();
    if (!mediaUrl) {
      return NextResponse.json({ error: "mediaUrl is required" }, { status: 400 });
    }

    const story = await StoryService.createStory(userId, mediaUrl);
    return NextResponse.json(story);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
