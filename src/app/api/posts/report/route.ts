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

    const { postId, reelId, reason } = await request.json();
    if ((!postId && !reelId) || !reason || !reason.trim()) {
      return NextResponse.json({ error: "postId or reelId and reason are required" }, { status: 400 });
    }

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
    }

    // Create the report
    const report = await prisma.report.create({
      data: {
        reporterId: userId,
        reportedId: targetAuthorId,
        postId: postId || null,
        reelId: reelId || null,
        reason: reason.trim(),
        status: "PENDING",
      },
    });

    return NextResponse.json({ success: true, report });
  } catch (error: any) {
    console.error("[POST /api/posts/report Error]", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
