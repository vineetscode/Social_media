import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { StoryService } from "@/modules/post/services/story.service";
import { syncUserWithDb } from "@/lib/auth-sync";

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await syncUserWithDb(userId);

    const activeStories = await StoryService.getActiveStoriesForUser(userId);
    return NextResponse.json(activeStories);
  } catch (error: any) {
    console.error("[GET /api/stories Error]", error);
    return NextResponse.json(
      { error: "Out of Service", message: "Sorry for the inconvenience. The system is temporarily offline." },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await syncUserWithDb(userId);

    const { mediaUrl } = await request.json();
    if (!mediaUrl) {
      return NextResponse.json({ error: "mediaUrl is required" }, { status: 400 });
    }

    const story = await StoryService.createStory(userId, mediaUrl);
    return NextResponse.json(story);
  } catch (error: any) {
    console.error("[POST /api/stories Error]", error);
    return NextResponse.json(
      { error: "Out of Service", message: "Sorry for the inconvenience. The system is temporarily offline." },
      { status: 503 }
    );
  }
}
