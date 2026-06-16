import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { UserService } from "@/modules/user/services/user.service";
import ProfileClient from "./profile-client";
import { notFound } from "next/navigation";
import { Metadata } from "next";

export async function generateMetadata({
  params: paramsPromise,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const params = await paramsPromise;
  const targetUsername = decodeURIComponent(params.username);
  const profile = await UserService.getUserProfile(targetUsername);

  if (!profile) {
    return {
      title: "User Not Found | JabWeMet",
    };
  }

  const title = `${profile.displayName} (@${profile.username}) | JabWeMet`;
  const description = profile.bio || `Check out ${profile.displayName}'s profile on JabWeMet.`;
  const imageUrl = profile.avatarUrl || "/logo.jpg";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      username: profile.username,
      images: [
        {
          url: imageUrl,
          width: 800,
          height: 800,
          alt: profile.displayName,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function ProfilePage({
  params: paramsPromise,
}: {
  params: Promise<{ username: string }>;
}) {
  const { userId: currentUserId } = await auth();
  if (!currentUserId) {
    return null; // Clerk middleware handles redirecting to login
  }

  const params = await paramsPromise;
  const targetUsername = decodeURIComponent(params.username);

  // Fetch target profile details
  const profile = await UserService.getUserProfile(targetUsername);
  if (!profile) {
    notFound();
  }

  // Fetch posts, follow relationship, and block relationship in parallel
  const [posts, follow, block] = await Promise.all([
    prisma.post.findMany({
      where: { authorId: profile.userId },
      orderBy: { createdAt: "desc" },
      include: {
        media: true,
        _count: {
          select: { likes: true, comments: true },
        },
      },
    }),
    currentUserId !== profile.userId
      ? prisma.follower.findUnique({
          where: {
            followerId_followingId: {
              followerId: currentUserId,
              followingId: profile.userId,
            },
          },
        })
      : Promise.resolve(null),
    currentUserId !== profile.userId
      ? prisma.block.findFirst({
          where: {
            OR: [
              { blockerId: currentUserId, blockedId: profile.userId },
              { blockerId: profile.userId, blockedId: currentUserId }
            ]
          }
        })
      : Promise.resolve(null),
  ]);

  const isFollowing = !!follow;
  const isBlocked = !!block;
  const hasBlocked = block ? block.blockerId === currentUserId : false;

  // Enforce privacy and block checks
  const isSelf = currentUserId === profile.userId;
  const isLocked = !isSelf && profile.isPrivate && !isFollowing;
  const hidePosts = isBlocked || isLocked;

  // Serialize objects for safely passing down to Client Component
  const serializedProfile = {
    userId: profile.userId,
    username: profile.username,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl || undefined,
    bio: profile.bio || undefined,
    website: profile.website || undefined,
    followerCount: profile.followerCount,
    followingCount: profile.followingCount,
    isVerified: profile.isVerified,
    isPrivate: profile.isPrivate,
  };

  const serializedPosts = hidePosts
    ? []
    : posts.map((post) => ({
        id: post.id,
        caption: post.caption || "",
        createdAt: post.createdAt.toISOString(),
        media: post.media.map((med) => ({
          id: med.id,
          url: med.url,
          secureUrl: med.secureUrl,
          type: med.type,
        })),
        _count: {
          likes: post._count.likes,
          comments: post._count.comments,
        },
      }));

  return (
    <ProfileClient
      initialProfile={serializedProfile}
      initialPosts={serializedPosts}
      initialIsFollowing={isFollowing}
      isSelf={isSelf}
      targetUsername={targetUsername}
      isBlocked={isBlocked}
      hasBlocked={hasBlocked}
    />
  );
}
