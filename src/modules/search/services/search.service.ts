import prisma from "@/lib/prisma";

export class SearchService {
  // Use case-insensitive substring matching via Prisma to reliably find partial and exact matches
  static async searchProfiles(query: string, limit = 20) {
    if (!query || query.trim() === "") return [];

    return prisma.profile.findMany({
      where: {
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

  static async searchPosts(query: string, limit = 20) {
    if (!query || query.trim() === "") return [];

    return prisma.post.findMany({
      where: {
        caption: { contains: query, mode: "insensitive" }
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

