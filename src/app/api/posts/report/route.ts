import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { syncUserWithDb } from "@/lib/auth-sync";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await syncUserWithDb(userId);

    const { postId, reelId, commentId, category, reason } = await request.json();
    if (!postId && !reelId && !commentId) {
      return NextResponse.json({ error: "postId, reelId, or commentId is required" }, { status: 400 });
    }

    const allowedCategories = ["Spam", "Harassment", "Violence", "Nudity", "Fake Account", "Copyright", "Other"];
    const finalCategory = allowedCategories.includes(category) ? category : "Other";

    let targetAuthorId: string | null = null;

    if (postId) {
      // Find the post to get the authorId
      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { authorId: true },
      });
      if (!post) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }
      targetAuthorId = post.authorId;
    } else if (reelId) {
      // Find the reel to get the authorId
      const reel = await prisma.reel.findUnique({
        where: { id: reelId },
        select: { authorId: true },
      });
      if (!reel) {
        return NextResponse.json({ error: "Reel not found" }, { status: 404 });
      }
      targetAuthorId = reel.authorId;
    } else if (commentId) {
      // Find the comment to get the authorId
      const comment = await prisma.comment.findUnique({
        where: { id: commentId },
        select: { authorId: true },
      });
      if (!comment) {
        return NextResponse.json({ error: "Comment not found" }, { status: 404 });
      }
      targetAuthorId = comment.authorId;
    }

    // Create the report
    const report = await prisma.report.create({
      data: {
        reporterId: userId,
        reportedId: targetAuthorId,
        postId: postId || null,
        reelId: reelId || null,
        commentId: commentId || null,
        category: finalCategory,
        reason: reason?.trim() || `Flagged as ${finalCategory}`,
        status: "PENDING",
      },
    });

    return NextResponse.json({ success: true, report });
  } catch (error: any) {
    console.error("[POST /api/posts/report Error]", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
