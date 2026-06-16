import prisma from "@/lib/prisma";

export class ReelService {
  // Publish a new Reel
  static async createReel(authorId: string, caption: string | undefined, mediaUrl: string) {
    return prisma.reel.create({
      data: {
        authorId,
        caption,
        media: {
          create: {
            url: mediaUrl,
            secureUrl: mediaUrl,
            publicId: `reel_${Date.now()}`,
            format: "mp4",
            width: 1080,
            height: 1920,
            type: "VIDEO",
            duration: 15.0, // Mock duration default
          },
        },
      },
      include: {
        media: true,
      },
    });
  }

  // Fetch all reels with creator profiles and media for infinite scroll feed
  static async getReels(userId?: string, limit = 10) {
    const includeObj: any = {
      author: {
        select: {
          profile: {
            select: {
              username: true,
              displayName: true,
              avatarUrl: true,
              isVerified: true,
            },
          },
        },
      },
      media: true,
      _count: {
        select: {
          likes: true,
          comments: true,
        },
      },
    };

    const whereObj: any = {};

    if (userId) {
      includeObj.likes = {
        where: {
          userId,
        },
        select: {
          userId: true,
        },
      };

      // Fetch block boundaries and followed users in parallel
      const [blocks, followers] = await Promise.all([
        prisma.block.findMany({
          where: {
            OR: [
              { blockerId: userId },
              { blockedId: userId }
            ]
          },
          select: { blockerId: true, blockedId: true }
        }),
        prisma.follower.findMany({
          where: { followerId: userId },
          select: { followingId: true }
        })
      ]);

      const blockedUserIds = Array.from(new Set(
        blocks.flatMap(b => [b.blockerId, b.blockedId])
      )).filter(id => id !== userId);

      const followingIds = followers.map(f => f.followingId);

      // Exclude blocked users. Only show reels from self, followed users, or public users
      whereObj.authorId = { notIn: blockedUserIds };
      whereObj.OR = [
        { authorId: userId },
        { authorId: { in: followingIds } },
        { author: { profile: { isPrivate: false } } }
      ];
    } else {
      // If no userId, only show public creators
      whereObj.author = { profile: { isPrivate: false } };
    }

    return prisma.reel.findMany({
      where: whereObj,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: includeObj,
    });
  }

  // Increment video views counter
  static async incrementViews(reelId: string) {
    return prisma.reel.update({
      where: { id: reelId },
      data: {
        viewsCount: { increment: 1 },
      },
    });
  }

  // Like or unlike a reel (toggle implementation)
  static async toggleLike(userId: string, reelId: string) {
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_reelId: { userId, reelId },
      },
    });

    if (existingLike) {
      await prisma.like.delete({
        where: { id: existingLike.id },
      });
      return { liked: false };
    } else {
      await prisma.like.create({
        data: { userId, reelId },
      });
      return { liked: true };
    }
  }

  // Comment on a reel
  static async addComment(authorId: string, reelId: string, content: string, parentId?: string) {
    return prisma.comment.create({
      data: {
        authorId,
        reelId,
        content,
        parentId,
      },
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
  }
}
