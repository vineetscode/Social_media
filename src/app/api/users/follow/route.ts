import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { FollowService } from "@/modules/follow/services/follow.service";
import { syncUserWithDb } from "@/lib/auth-sync";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await syncUserWithDb(userId);

  try {
    const { followingId } = await request.json();
    if (!followingId) {
      return NextResponse.json({ error: "followingId is required" }, { status: 400 });
    }

    if (userId === followingId) {
      return NextResponse.json({ error: "You cannot follow yourself" }, { status: 400 });
    }

    // Check if already following
    const existingFollow = await prisma.follower.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId,
        },
      },
    });

    if (existingFollow) {
      await FollowService.unfollowUser(userId, followingId);
      return NextResponse.json({ following: false });
    } else {
      await FollowService.followUser(userId, followingId);
      return NextResponse.json({ following: true });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
