import prisma from "@/lib/prisma";
import { NotificationType } from "@prisma/client";

export class NotificationService {
  // Create and publish a notification
  static async createNotification(recipientId: string, senderId: string | null, type: NotificationType, referenceId?: string) {
    // Avoid notifying yourself
    if (recipientId === senderId) return null;

    const notif = await prisma.notification.create({
      data: {
        recipientId,
        senderId,
        type,
        referenceId,
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

    // In production, trigger a WebSocket message emit here to notify recipient instantly if connected.
    // triggerRealtimeNotification(recipientId, notif);

    return notif;
  }

  // Retrieve unread notifications for a user
  static async getNotifications(recipientId: string, limit = 20) {
    return prisma.notification.findMany({
      where: { recipientId },
      take: limit,
      orderBy: { createdAt: "desc" },
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

  // Mark notifications as read
  static async markAllAsRead(recipientId: string) {
    return prisma.notification.updateMany({
      where: { recipientId, isRead: false },
      data: { isRead: true },
    });
  }
}
