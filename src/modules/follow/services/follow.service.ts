import prisma from "@/lib/prisma";

export class FollowService {
  // Follow a user and increment counts in a database transaction
  static async followUser(followerId: string, followingId: string) {
    if (followerId === followingId) throw new Error("Users cannot follow themselves");

    return prisma.$transaction(async (tx) => {
      // Create follow link
      const follow = await tx.follower.create({
        data: { followerId, followingId },
      });

      // Increment following count
      await tx.profile.update({
        where: { userId: followerId },
        data: { followingCount: { increment: 1 } },
      });

      // Increment follower count
      await tx.profile.update({
        where: { userId: followingId },
        data: { followerCount: { increment: 1 } },
      });

      return follow;
    });
  }

  // Unfollow a user
  static async unfollowUser(followerId: string, followingId: string) {
    return prisma.$transaction(async (tx) => {
      const follow = await tx.follower.delete({
        where: {
          followerId_followingId: { followerId, followingId },
        },
      });

      // Decrement following count
      await tx.profile.update({
        where: { userId: followerId },
        data: { followingCount: { decrement: 1 } },
      });

      // Decrement follower count
      await tx.profile.update({
        where: { userId: followingId },
        data: { followerCount: { decrement: 1 } },
      });

      return follow;
    });
  }

  // Fetch all user IDs followed by a user
  static async getFollowingIds(userId: string): Promise<string[]> {
    const list = await prisma.follower.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    return list.map((item) => item.followingId);
  }

  // Graph algorithm: Find mutual connections between User A and User B
  // Intersecting adjacency sets using a simple SQL intersection (O(N) operations)
  static async getMutualConnections(userAId: string, userBId: string): Promise<string[]> {
    const mutuals = await prisma.$queryRaw<{ followingId: string }[]>`
      SELECT f1."followingId"
      FROM "Follower" f1
      INNER JOIN "Follower" f2 ON f1."followingId" = f2."followingId"
      WHERE f1."followerId" = ${userAId} AND f2."followerId" = ${userBId}
    `;
    return mutuals.map(m => m.followingId);
  }
}
