import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { PostService } from "@/modules/post/services/post.service";
import { ReelService } from "@/modules/post/services/reel.service";
import { NotificationService } from "@/modules/notification/services/notification.service";
import { syncUserWithDb } from "@/lib/auth-sync";

// GET: Retrieve comments for a Post or Reel
export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const postId = searchParams.get("postId");
    const reelId = searchParams.get("reelId");

    if (!postId && !reelId) {
      return NextResponse.json({ error: "Missing postId or reelId parameter" }, { status: 400 });
    }

    const comments = await prisma.comment.findMany({
      where: {
        postId: postId || undefined,
        reelId: reelId || undefined,
      },
      orderBy: { createdAt: "asc" }, // Read comments top-to-bottom
      include: {
        author: {
          select: {
            profile: {
              select: {
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(comments);
  } catch (error: any) {
    console.error("[GET /api/comments Error]", error);
    return NextResponse.json(
      { error: "Out of Service", message: "Sorry for the inconvenience. The system is temporarily offline." },
      { status: 503 }
    );
  }
}

// POST: Add a new comment
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure user profile sync exists
    await syncUserWithDb(userId);

    const { postId, reelId, content } = await request.json();
    if (!content || content.trim() === "") {
      return NextResponse.json({ error: "Comment content is required" }, { status: 400 });
    }

    if (!postId && !reelId) {
      return NextResponse.json({ error: "postId or reelId is required" }, { status: 400 });
    }

    let comment;
    let targetAuthorId: string | null = null;

    if (postId) {
      // Verify post exists and get author
      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { authorId: true },
      });
      if (!post) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }
      targetAuthorId = post.authorId;
      comment = await PostService.addComment(userId, postId, content);
    } else if (reelId) {
      // Verify reel exists and get author
      const reel = await prisma.reel.findUnique({
        where: { id: reelId },
        select: { authorId: true },
      });
      if (!reel) {
        return NextResponse.json({ error: "Reel not found" }, { status: 404 });
      }
      targetAuthorId = reel.authorId;
      comment = await ReelService.addComment(userId, reelId, content);
    }

    // Create a COMMENT notification if commenting on someone else's content
    if (comment && targetAuthorId && targetAuthorId !== userId) {
      await NotificationService.createNotification(
        targetAuthorId,
        userId,
        "COMMENT",
        comment.id
      );
    }

    return NextResponse.json(comment);
  } catch (error: any) {
    console.error("[POST /api/comments Error]", error);
    return NextResponse.json(
      { error: "Out of Service", message: "Sorry for the inconvenience. The system is temporarily offline." },
      { status: 503 }
    );
  }
}
