import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PostService } from "@/modules/post/services/post.service";
import { ReelService } from "@/modules/post/services/reel.service";
import { NotificationService } from "@/modules/notification/services/notification.service";
import { syncUserWithDb } from "@/lib/auth-sync";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Ensure user profile exists in database
  await syncUserWithDb(userId);

  try {
    const { postId } = await request.json();
    if (!postId) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    // Dynamic detection: check if ID belongs to a Post or Reel
    const postExists = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });

    let result;
    if (postExists) {
      result = await PostService.toggleLike(userId, postId);
      if (result.liked && postExists.authorId !== userId) {
        await NotificationService.createNotification(postExists.authorId, userId, "LIKE", postId);
      }
    } else {
      const reelExists = await prisma.reel.findUnique({
        where: { id: postId },
        select: { authorId: true },
      });

      if (reelExists) {
        result = await ReelService.toggleLike(userId, postId);
        if (result.liked && reelExists.authorId !== userId) {
          await NotificationService.createNotification(reelExists.authorId, userId, "LIKE", postId);
        }
      } else {
        return NextResponse.json({ error: "Entity not found" }, { status: 404 });
      }
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
