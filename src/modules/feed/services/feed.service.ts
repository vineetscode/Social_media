import prisma from "@/lib/prisma";
import { FollowService } from "@/modules/follow/services/follow.service";

export class FeedService {
  // 1. Chronological Feed Builder with Cursor-based pagination
  static async getChronologicalFeed(userId: string, limit = 20, cursor?: string) {
    const followingIds = await FollowService.getFollowingIds(userId);

    // If not following anyone, pull global public feed for discovery
    const filter = followingIds.length > 0 ? { authorId: { in: followingIds } } : {};

    return prisma.post.findMany({
      where: filter,
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: "desc" },
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
        likes: {
          where: {
            userId: userId,
          },
          select: {
            userId: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });
  }

  // 2. Ranked Feed Builder utilizing the gravity decay formula
  static async getRankedFeed(userId: string, limit = 20) {
    const followingIds = await FollowService.getFollowingIds(userId);
    const filter = followingIds.length > 0 ? { authorId: { in: followingIds } } : {};

    // Fetch candidate posts from the database first
    const posts = await prisma.post.findMany({
      where: filter,
      take: 100, // Fetch candidates to rank in-memory
      orderBy: { createdAt: "desc" },
      include: {
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
        likes: {
          where: {
            userId: userId,
          },
          select: {
            userId: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            bookmarks: true,
          },
        },
      },
    });

    const now = new Date().getTime();

    // Score and sort using the gravity decay algorithm
    const rankedPosts = posts.map((post) => {
      const likesCount = post._count.likes;
      const commentsCount = post._count.comments;
      const bookmarksCount = post._count.bookmarks;

      // Dynamic weights
      const w_l = 1.0;
      const w_c = 3.0;
      const w_b = 5.0;

      // Creator score boost
      const creatorBoost = post.author.profile?.isVerified ? 10 : 0;

      // Calculate time age in hours
      const ageHours = (now - post.createdAt.getTime()) / (1000 * 60 * 60);

      // Score formula: (w_l * L + w_c * C + w_b * B + CreatorBoost) / (Age + 2) ^ G
      const gravity = 1.5;
      const score = (likesCount * w_l + commentsCount * w_c + bookmarksCount * w_b + creatorBoost) / Math.pow(ageHours + 2, gravity);

      return {
        ...post,
        rankingScore: score,
      };
    });

    // Sort descending by calculated score
    return rankedPosts
      .sort((a, b) => b.rankingScore - a.rankingScore)
      .slice(0, limit);
  }
}
