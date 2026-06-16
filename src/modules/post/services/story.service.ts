import prisma from "@/lib/prisma";
import { FollowService } from "@/modules/follow/services/follow.service";

export class StoryService {
  // Publish a new story (24-hour lifespan)
  static async createStory(authorId: string, mediaUrl: string) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

    return prisma.story.create({
      data: {
        authorId,
        expiresAt,
        media: {
          create: {
            url: mediaUrl,
            secureUrl: mediaUrl,
            publicId: `story_${Date.now()}`,
            format: "webp",
            width: 1080,
            height: 1920,
            type: "IMAGE",
          },
        },
      },
      include: {
        media: true,
      },
    });
  }

  // Get active, unexpired stories from followings plus the user's own stories (excluding blocked users)
  static async getActiveStoriesForUser(userId: string) {
    const followingIds = await FollowService.getFollowingIds(userId);

    // Fetch block boundaries
    const blocks = await prisma.block.findMany({
      where: {
        OR: [
          { blockerId: userId },
          { blockedId: userId }
        ]
      },
      select: { blockerId: true, blockedId: true }
    });
    const blockedUserIds = Array.from(new Set(
      blocks.flatMap(b => [b.blockerId, b.blockedId])
    )).filter(id => id !== userId);

    const candidateIds = [userId, ...followingIds].filter(id => !blockedUserIds.includes(id));

    const now = new Date();

    return prisma.story.findMany({
      where: {
        authorId: { in: candidateIds },
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: "asc" },
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
        media: true,
        viewers: {
          select: {
            userId: true,
          },
        },
      },
    });
  }

  // Log a story view
  static async viewStory(userId: string, storyId: string) {
    try {
      return await prisma.storyViewer.upsert({
        where: {
          storyId_userId: { storyId, userId },
        },
        update: {},
        create: {
          storyId,
          userId,
        },
      });
    } catch (e) {
      // Ignore duplicate insertions gracefully
      return null;
    }
  }
}
