import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { SearchService } from "@/modules/search/services/search.service";
import { syncUserWithDb } from "@/lib/auth-sync";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await syncUserWithDb(userId);

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";

  if (!query.trim()) {
    return NextResponse.json({ users: [], posts: [] });
  }

  try {
    // 1. Hashtag Search Mode (if query starts with '#')
    if (query.startsWith("#")) {
      const tag = query.substring(1).trim();
      const hashtagPosts = await prisma.post.findMany({
        where: {
          hashtags: {
            some: {
              hashtag: {
                tag: { equals: tag, mode: "insensitive" },
              },
            },
          },
        },
        include: {
          author: {
            select: {
              profile: {
                select: {
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                  isVerified: true,
                },
              },
            },
          },
          media: true,
          likes: {
            where: {
              userId: userId,
            },
            select: {
              userId: true,
            },
          },
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({ users: [], posts: hashtagPosts });
    }

    // 2. Regular Text Search Mode (Users & Posts)
    const [rawUsers, rawPosts] = await Promise.all([
      SearchService.searchProfiles(query, 20),
      SearchService.searchPosts(query, 20),
    ]);

    // Map raw sql results to prisma formats if needed, or query fuller objects
    const postIds = rawPosts.map((rp) => rp.id);
    const fullPosts = postIds.length > 0 
      ? await prisma.post.findMany({
          where: { id: { in: postIds } },
          include: {
            author: {
              select: {
                profile: {
                  select: {
                    username: true,
                    displayName: true,
                    avatarUrl: true,
                    isVerified: true,
                  },
                },
              },
            },
            media: true,
            likes: {
              where: {
                userId: userId,
              },
              select: {
                userId: true,
              },
            },
            _count: {
              select: {
                likes: true,
                comments: true,
              },
            },
          },
        })
      : [];

    return NextResponse.json({
      users: rawUsers,
      posts: fullPosts,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
