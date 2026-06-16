import prisma from "@/lib/prisma";

export class ExploreService {
  // Fetch global trending posts ranked by gravity engagement score
  static async getGlobalTrendingFeed(userId: string, limit = 20) {
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

    const posts = await prisma.post.findMany({
      where: {
        authorId: { notIn: blockedUserIds },
        OR: [
          { authorId: userId },
          { authorId: { in: followingIds } },
          { author: { profile: { isPrivate: false } } }
        ]
      },
      take: 100, // Fetch top 100 candidate posts for ranking
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

    const now = Date.now();
    const gravity = 1.5;

    const ranked = posts.map((post) => {
      const likesCount = post._count.likes;
      const commentsCount = post._count.comments;
      const bookmarksCount = post._count.bookmarks;

      // Weights: likes=1.0, comments=3.0, bookmarks=5.0
      const w_l = 1.0;
      const w_c = 3.0;
      const w_b = 5.0;

      const creatorBoost = post.author.profile?.isVerified ? 10 : 0;
      const ageHours = (now - post.createdAt.getTime()) / (1000 * 60 * 60);

      // Score = (w_l * L + w_c * C + w_b * B + Boost) / (Age + 2)^G
      const score = (likesCount * w_l + commentsCount * w_c + bookmarksCount * w_b + creatorBoost) / Math.pow(ageHours + 2, gravity);

      return {
        ...post,
        rankingScore: score,
      };
    });

    return ranked
      .sort((a, b) => b.rankingScore - a.rankingScore)
      .slice(0, limit);
  }

  // Fetch top creators ordered by follower count (excluding self, followed users, and blocked users)
  static async getPopularCreators(userId?: string, limit = 5) {
    let excludeUserIds: string[] = [];

    if (userId) {
      excludeUserIds.push(userId);

      // Fetch followed users and blocks in parallel to exclude them from suggestions
      const [followers, blocks] = await Promise.all([
        prisma.follower.findMany({
          where: { followerId: userId },
          select: { followingId: true }
        }),
        prisma.block.findMany({
          where: {
            OR: [
              { blockerId: userId },
              { blockedId: userId }
            ]
          },
          select: { blockerId: true, blockedId: true }
        })
      ]);

      excludeUserIds.push(...followers.map(f => f.followingId));
      excludeUserIds.push(...blocks.flatMap(b => [b.blockerId, b.blockedId]));
    }

    // De-duplicate exclusions
    const finalExcludeIds = Array.from(new Set(excludeUserIds));

    return prisma.profile.findMany({
      where: finalExcludeIds.length > 0 ? { userId: { notIn: finalExcludeIds } } : undefined,
      take: limit,
      orderBy: {
        followerCount: "desc",
      },
      select: {
        userId: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        followerCount: true,
        isVerified: true,
      },
    });
  }
}
