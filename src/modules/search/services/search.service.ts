import prisma from "@/lib/prisma";

export class SearchService {
  // Phase 1: PostgreSQL Full-Text Search (FTS) utilizing raw SQL and full-text indexes
  static async searchProfiles(query: string, limit = 20) {
    if (!query || query.trim() === "") return [];

    // Format query search tokens for tsquery syntax e.g., 'term1 & term2:*'
    const formattedQuery = query
      .trim()
      .split(/\s+/)
      .map((token) => `${token}:*`)
      .join(" & ");

    // Execute raw SQL on PostgreSQL GIN-indexed columns
    return prisma.$queryRaw<any[]>`
      SELECT p.id, p."userId", p.username, p."displayName", p."avatarUrl", p.bio, p."isVerified"
      FROM "Profile" p
      WHERE to_tsvector('english', p.username || ' ' || p."displayName" || ' ' || COALESCE(p.bio, '')) 
      @@ to_tsquery('english', ${formattedQuery})
      LIMIT ${limit}
    `;
  }

  static async searchPosts(query: string, limit = 20) {
    if (!query || query.trim() === "") return [];

    const formattedQuery = query
      .trim()
      .split(/\s+/)
      .map((token) => `${token}:*`)
      .join(" & ");

    return prisma.$queryRaw<any[]>`
      SELECT post.id, post."authorId", post.caption, post."createdAt"
      FROM "Post" post
      WHERE to_tsvector('english', COALESCE(post.caption, '')) 
      @@ to_tsquery('english', ${formattedQuery})
      ORDER BY post."createdAt" DESC
      LIMIT ${limit}
    `;
  }

  // Phase 2: Elasticsearch placeholder
  static async searchElasticsearch(index: string, query: string) {
    // In Phase 2:
    // const client = getElasticsearchClient();
    // return client.search({ index, body: { query: { match: { content: query } } } });
    console.log(`Routing query to Elasticsearch index: ${index}. Query: ${query}`);
    throw new Error("Elasticsearch provider not initialized. Running in PostgreSQL Phase 1.");
  }
}
