import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { UserService } from "@/modules/user/services/user.service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { userId: currentUserId } = await auth();
    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { username } = await params;
    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    // Fetch the profile
    const profile = await UserService.getUserProfile(username);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Fetch all posts by this profile author
    const posts = await prisma.post.findMany({
      where: { authorId: profile.userId },
      orderBy: { createdAt: "desc" },
      include: {
        media: true,
        _count: {
          select: { likes: true, comments: true },
        },
      },
    });

    // Check if the current user follows this profile
    let isFollowing = false;
    if (currentUserId !== profile.userId) {
      const follow = await prisma.follower.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: profile.userId,
          },
        },
      });
      isFollowing = !!follow;
    }

    return NextResponse.json({
      profile,
      posts,
      isFollowing,
      isSelf: currentUserId === profile.userId,
    });
  } catch (error: any) {
    console.error("[GET Profile Error]", error);
    return NextResponse.json({ error: error.message || "Failed to load profile" }, { status: 500 });
  }
}
