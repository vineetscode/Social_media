import { auth, currentUser } from "@clerk/nextjs/server";
import { FeedService } from "@/modules/feed/services/feed.service";
import FeedClient from "./feed-client";
import { redirect } from "next/navigation";

export default async function FeedPage() {
  const { userId } = await auth();
  const user = await currentUser();

  // If user is not authenticated, Clerk middleware handles redirection,
  // but we provide a safety fallback here.
  if (!userId || !user) {
    redirect("/");
  }

  // Fetch initial feed posts on the server
  const initialData = await FeedService.getRankedFeed(userId, 10);

  const serializedUser = {
    id: user.id,
    username: user.username || `user_${user.id.substring(0, 8)}`,
    fullName: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "User",
    imageUrl: user.imageUrl || "",
  };

  const serializedPosts = initialData.posts.map((post) => ({
    id: post.id,
    caption: post.caption,
    createdAt: post.createdAt.toISOString(),
    author: {
      profile: post.author.profile ? {
        username: post.author.profile.username,
        displayName: post.author.profile.displayName,
        avatarUrl: post.author.profile.avatarUrl || undefined,
        isVerified: post.author.profile.isVerified,
      } : null,
    },
    media: post.media.map((med) => ({
      id: med.id,
      url: med.url,
      secureUrl: med.secureUrl || med.url,
      type: med.type,
    })),
    likes: post.likes,
    _count: {
      likes: post._count.likes,
      comments: post._count.comments,
    },
  }));

  return (
    <FeedClient
      initialPosts={serializedPosts}
      initialCursor={initialData.nextCursor}
      currentUser={serializedUser}
    />
  );
}
