import { currentUser } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

// In-memory cache to store already verified userIds.
// This prevents running database queries on every authenticated API endpoint request.
const syncedUsersCache = new Set<string>();

export async function syncUserWithDb(userId: string) {
  if (syncedUsersCache.has(userId)) {
    return true;
  }

  // Check if user exists in database
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (existingUser) {
    syncedUsersCache.add(userId);
    return existingUser;
  }

  // Otherwise, fetch user details from Clerk
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  const username = clerkUser.username || `user_${userId.substring(0, 8)}`;
  const displayName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || username;
  const avatarUrl = clerkUser.imageUrl || "";

  // Synchronize to local database
  return prisma.$transaction(async (tx) => {
    const userCount = await tx.user.count();
    const role = userCount === 0 ? "ADMIN" : "USER";

    const user = await tx.user.upsert({
      where: { id: userId },
      update: { email },
      create: { id: userId, email, role },
    });

    await tx.profile.upsert({
      where: { userId },
      update: {
        username,
        displayName,
        avatarUrl,
      },
      create: {
        userId,
        username,
        displayName,
        avatarUrl,
      },
    });

    syncedUsersCache.add(userId);
    return user;
  });
}
