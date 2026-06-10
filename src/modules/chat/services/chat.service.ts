import prisma from "@/lib/prisma";
import { UserService } from "@/modules/user/services/user.service";

export class ChatService {
  // Send a direct message to a user, checking blocks first
  static async sendMessage(senderId: string, recipientId: string, content?: string, mediaUrl?: string) {
    // Enforce social boundaries
    const isBlocked = await UserService.hasInteractionBlocks(senderId, recipientId);
    if (isBlocked) {
      throw new Error("Unable to send message: Block restrictions active.");
    }

    return prisma.message.create({
      data: {
        senderId,
        recipientId,
        content,
        mediaUrl,
      },
      include: {
        sender: {
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

  // Retrieve message history between two users
  static async getChatHistory(userA: string, userB: string, limit = 50, cursor?: string) {
    return prisma.message.findMany({
      where: {
        OR: [
          { senderId: userA, recipientId: userB },
          { senderId: userB, recipientId: userA },
        ],
      },
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: "desc" },
    });
  }

  // Mark all unread messages from a sender as read
  static async markAsRead(recipientId: string, senderId: string) {
    return prisma.message.updateMany({
      where: {
        senderId,
        recipientId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }
}
