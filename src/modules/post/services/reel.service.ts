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

    if (userId) {
      includeObj.likes = {
        where: {
          userId,
        },
        select: {
          userId: true,
        },
      };
    }

    return prisma.reel.findMany({
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
