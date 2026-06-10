import prisma from "@/lib/prisma";

export class PostService {
  // Create a new post with optional multi-media files
  static async createPost(authorId: string, caption: string | undefined, mediaFiles: { url: string; secureUrl: string; publicId: string; format: string; width: number; height: number; type: "IMAGE" | "VIDEO" }[]) {
    return prisma.post.create({
      data: {
        authorId,
        caption,
        media: {
          createMany: {
            data: mediaFiles.map((m) => ({
              url: m.url,
              secureUrl: m.secureUrl,
              publicId: m.publicId,
              format: m.format,
              width: m.width,
              height: m.height,
              type: m.type,
            })),
          },
        },
      },
      include: {
        media: true,
      },
    });
  }

  // Delete a post
  static async deletePost(postId: string, authorId: string) {
    // Enforce authorization bounds
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.authorId !== authorId) {
      throw new Error("Unauthorized or post not found");
    }

    return prisma.post.delete({
      where: { id: postId },
    });
  }

  // Like or unlike a post (toggle implementation)
  static async toggleLike(userId: string, postId: string) {
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: { userId, postId },
      },
    });

    if (existingLike) {
      await prisma.like.delete({
        where: { id: existingLike.id },
      });
      return { liked: false };
    } else {
      await prisma.like.create({
        data: { userId, postId },
      });
      return { liked: true };
    }
  }

  // Comment on a post
  static async addComment(authorId: string, postId: string, content: string, parentId?: string) {
    return prisma.comment.create({
      data: {
        authorId,
        postId,
        content,
        parentId,
      },
      include: {
        author: {
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
}
