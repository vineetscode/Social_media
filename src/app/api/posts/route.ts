import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PostService } from "@/modules/post/services/post.service";
import { syncUserWithDb } from "@/lib/auth-sync";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Ensure user profile exists in database
  await syncUserWithDb(userId);

  try {
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
