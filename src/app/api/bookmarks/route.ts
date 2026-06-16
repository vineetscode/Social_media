import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { rateLimiter } from "@/lib/memory-rate-limiter";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting: max 60 bookmarks per minute
    const limitCheck = await rateLimiter.rateLimit(`${userId}:bookmarks`, 60000, 60);
    if (!limitCheck.success) {
      return NextResponse.json(
        { error: "Too Many Requests", message: "You are bookmarking posts too fast. Please wait a moment." },
        {
          status: 429,
          headers: { "Retry-After": Math.ceil((limitCheck.resetTime - Date.now()) / 1000).toString() }
        }
      );
    }

    const { postId } = await request.json();
    if (!postId) {
      return NextResponse.json({ error: "Post ID is required" }, { status: 400 });
    }

    // Check if the post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Check if user already bookmarked this post
    const existingBookmark = await prisma.bookmark.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    if (existingBookmark) {
      // Un-bookmark (remove)
      await prisma.bookmark.delete({
        where: {
          id: existingBookmark.id,
        },
      });
      return NextResponse.json({ bookmarked: false });
    } else {
      // Bookmark (save)
      await prisma.bookmark.create({
        data: {
          userId,
          postId,
        },
      });
      return NextResponse.json({ bookmarked: true });
    }
  } catch (error: any) {
    console.error("[POST /api/bookmarks Error]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
