import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { syncUserWithDb } from "@/lib/auth-sync";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await syncUserWithDb(userId);

  try {
    // Check role boundaries
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Access Denied. Admin privileges required." }, { status: 403 });
    }

    // Query Metrics
    const [totalUsers, totalPosts, totalReels, totalReports, reports] = await Promise.all([
      prisma.user.count(),
      prisma.post.count(),
      prisma.reel.count(),
      prisma.report.count(),
      prisma.report.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          reporter: {
            select: {
              profile: {
                select: {
                  username: true,
                  displayName: true,
                },
              },
            },
          },
          reported: {
            select: {
              profile: {
                select: {
                  username: true,
                  displayName: true,
                },
              },
            },
          },
          post: {
            select: {
              id: true,
              caption: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      metrics: {
        totalUsers,
        totalPosts,
        totalReels,
        totalReports,
      },
      reports,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await syncUserWithDb(userId);

  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Access Denied. Admin privileges required." }, { status: 403 });
    }

    const { reportId, action } = await request.json();
    if (!reportId || !action) {
      return NextResponse.json({ error: "reportId and action are required" }, { status: 400 });
    }

    if (action === "RESOLVE") {
      // Find report details to see if a post/content needs deletion
      const report = await prisma.report.findUnique({
        where: { id: reportId },
      });

      if (report?.postId) {
        // Delete offending post
        await prisma.post.delete({
          where: { id: report.postId },
        });
      }

      await prisma.report.update({
        where: { id: reportId },
        data: { status: "RESOLVED" },
      });

      return NextResponse.json({ success: true, message: "Content deleted and report resolved" });
    }

    if (action === "DISMISS") {
      await prisma.report.update({
        where: { id: reportId },
        data: { status: "DISMISSED" },
      });
      return NextResponse.json({ success: true, message: "Report dismissed" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
