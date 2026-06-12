import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const blockedUsers = await prisma.block.findMany({
      where: { blockerId: userId },
      include: {
        blocked: {
          select: {
            id: true,
            email: true,
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
      orderBy: { createdAt: "desc" },
    });

    // Format list for presentation
    const list = blockedUsers.map((b) => ({
      userId: b.blocked.id,
      username: b.blocked.profile?.username || "unknown",
      displayName: b.blocked.profile?.displayName || "Blocked User",
      avatarUrl: b.blocked.profile?.avatarUrl,
    }));

    return NextResponse.json(list);
  } catch (error: any) {
    console.error("[GET /api/users/block Error]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { targetId } = await request.json();
    if (!targetId) {
      return NextResponse.json({ error: "Target User ID is required" }, { status: 400 });
    }

    if (userId === targetId) {
      return NextResponse.json({ error: "You cannot block yourself" }, { status: 400 });
    }

    const existingBlock = await prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: userId,
          blockedId: targetId,
        },
      },
    });

    if (existingBlock) {
      // Unblock
      await prisma.block.delete({
        where: {
          id: existingBlock.id,
        },
      });
      return NextResponse.json({ blocked: false });
    } else {
      // Block
      await prisma.block.create({
        data: {
          blockerId: userId,
          blockedId: targetId,
        },
      });
      
      // Also delete any existing follows between them to sever connections
      await prisma.follower.deleteMany({
        where: {
          OR: [
            { followerId: userId, followingId: targetId },
            { followerId: targetId, followingId: userId },
          ],
        },
      });

      return NextResponse.json({ blocked: true });
    }
  } catch (error: any) {
    console.error("[POST /api/users/block Error]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
