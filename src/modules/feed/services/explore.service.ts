import prisma from "@/lib/prisma";

export class ExploreService {
  // Fetch global trending posts ranked by gravity engagement score
  static async getGlobalTrendingFeed(limit = 20) {
    const posts = await prisma.post.findMany({
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

  // Fetch top creators ordered by follower count
  static async getPopularCreators(limit = 5) {
    return prisma.profile.findMany({
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
