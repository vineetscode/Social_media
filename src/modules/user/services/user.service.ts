import prisma from "@/lib/prisma";

export class UserService {
  // Retrieve public profile of a user
  static async getUserProfile(username: string) {
    return prisma.profile.findUnique({
      where: { username },
      include: {
        user: {
          select: {
            role: true,
            createdAt: true,
          },
        },
      },
    });
  }

  // Check if a block exists between two users
  static async isUserBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const block = await prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId,
        },
      },
    });
    return !!block;
  }

  // Retrieve block constraints for a transaction
  static async hasInteractionBlocks(userA: string, userB: string): Promise<boolean> {
    const blocks = await prisma.block.findMany({
      where: {
        OR: [
          { blockerId: userA, blockedId: userB },
          { blockerId: userB, blockedId: userA },
        ],
      },
    });
    return blocks.length > 0;
  }
}
