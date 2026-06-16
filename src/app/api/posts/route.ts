import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PostService } from "@/modules/post/services/post.service";
import { syncUserWithDb } from "@/lib/auth-sync";
import { rateLimiter } from "@/lib/memory-rate-limiter";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting: max 10 posts per minute
    const limitCheck = await rateLimiter.rateLimit(`${userId}:posts`, 60000, 10);
    if (!limitCheck.success) {
      return NextResponse.json(
        { error: "Too Many Requests", message: "You are posting too fast. Please wait before creating more posts." },
        {
          status: 429,
          headers: { "Retry-After": Math.ceil((limitCheck.resetTime - Date.now()) / 1000).toString() }
        }
      );
    }

    // Ensure user profile exists in database
    await syncUserWithDb(userId);

    const { caption, imageUrl } = await request.json();
    if (!caption || caption.trim() === "") {
      return NextResponse.json({ error: "Caption is required" }, { status: 400 });
    }

    const mediaFiles = [];
    if (imageUrl) {
      const publicId = imageUrl.split("/").pop()?.split(".")[0] || `post_${Date.now()}`;
      mediaFiles.push({
        url: imageUrl,
        secureUrl: imageUrl,
        publicId,
        format: imageUrl.split(".").pop() || "png",
        width: 1200,
        height: 630,
        type: "IMAGE" as const,
      });
    }

    const post = await PostService.createPost(userId, caption, mediaFiles);
    return NextResponse.json(post);
  } catch (error: any) {
    console.error("[POST /api/posts Error]", error);
    return NextResponse.json(
      { error: "Out of Service", message: "Sorry for the inconvenience. The system is temporarily offline." },
      { status: 503 }
    );
  }
}
