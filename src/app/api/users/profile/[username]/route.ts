import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { UserService } from "@/modules/user/services/user.service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const startTotal = performance.now();
  let startQuery = 0;
  let endQuery = 0;
  let startAuth = 0;
  let endAuth = 0;
  let queryCount = 0;

  try {
    startAuth = performance.now();
    const { userId: currentUserId } = await auth();
    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    endAuth = performance.now();

    const { username } = await params;
    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    startQuery = performance.now();
    // Fetch the profile
    const profile = await UserService.getUserProfile(username);
    queryCount += 1;
    if (!profile) {
      endQuery = performance.now();
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Fetch posts and check following status in parallel to reduce sequential DB round-trips
    const [posts, follow] = await Promise.all([
      prisma.post.findMany({
        where: { authorId: profile.userId },
        orderBy: { createdAt: "desc" },
        include: {
          media: true,
          _count: {
            select: { likes: true, comments: true },
          },
        },
      }),
      currentUserId !== profile.userId
        ? prisma.follower.findUnique({
            where: {
              followerId_followingId: {
                followerId: currentUserId,
                followingId: profile.userId,
              },
            },
          })
        : Promise.resolve(null),
    ]);

    const isFollowing = !!follow;
    queryCount += 2;
    endQuery = performance.now();

    const startSerialization = performance.now();
    const payload = {
      profile,
      posts,
      isFollowing,
      isSelf: currentUserId === profile.userId,
    };
    const responseBody = JSON.stringify(payload);
    const endSerialization = performance.now();

    const endTotal = performance.now();

    console.log(
      `[PERF LOG] GET /api/users/profile/${username} | ` +
      `Total: ${(endTotal - startTotal).toFixed(2)}ms | ` +
      `Auth: ${(endAuth - startAuth).toFixed(2)}ms | ` +
      `Query: ${(endQuery - startQuery).toFixed(2)}ms (count: ${queryCount}) | ` +
      `Serialization: ${(endSerialization - startSerialization).toFixed(2)}ms`
    );

    return new NextResponse(responseBody, {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    const endTotal = performance.now();
    console.error(`[PERF LOG ERROR] GET /api/users/profile | Total: ${(endTotal - startTotal).toFixed(2)}ms |`, error);
    return NextResponse.json({ error: error.message || "Failed to load profile" }, { status: 500 });
  }
}
