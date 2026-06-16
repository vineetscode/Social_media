import prisma from "@/lib/prisma";

export class SearchService {
  // Use case-insensitive substring matching via Prisma to reliably find partial and exact matches
  static async searchProfiles(userId: string, query: string, limit = 20) {
    if (!query || query.trim() === "") return [];

    // Fetch user block boundaries
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

    return prisma.profile.findMany({
      where: {
        userId: { notIn: blockedUserIds },
        OR: [
          { username: { contains: query, mode: "insensitive" } },
          { displayName: { contains: query, mode: "insensitive" } },
          { bio: { contains: query, mode: "insensitive" } }
        ]
      },
      select: {
        id: true,
        userId: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        isVerified: true,
      },
      take: limit,
    });
  }

  static async searchPosts(userId: string, query: string, limit = 20) {
    if (!query || query.trim() === "") return [];

    // Fetch blocks and follow list in parallel
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

    return prisma.post.findMany({
      where: {
        caption: { contains: query, mode: "insensitive" },
        authorId: { notIn: blockedUserIds },
        OR: [
          { authorId: userId },
          { authorId: { in: followingIds } },
          { author: { profile: { isPrivate: false } } }
        ]
      },
      select: {
        id: true,
        authorId: true,
        caption: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc"
      },
      take: limit,
    });
  }

  // Phase 2: Elasticsearch placeholder
  static async searchElasticsearch(index: string, query: string) {
    console.log(`Routing query to Elasticsearch index: ${index}. Query: ${query}`);
    throw new Error("Elasticsearch provider not initialized. Running in PostgreSQL Phase 1.");
  }
}

