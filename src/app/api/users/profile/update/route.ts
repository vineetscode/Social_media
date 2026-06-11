import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { username, displayName, bio } = await request.json();

    if (!username || username.trim() === "") {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    if (!displayName || displayName.trim() === "") {
      return NextResponse.json({ error: "Display name is required" }, { status: 400 });
    }

    // Verify username format (alphanumeric and underscores only, 3-20 chars)
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json({
        error: "Username must be 3-20 characters long and can only contain letters, numbers, and underscores.",
      }, { status: 400 });
    }

    // Check if the username is already taken by another user
    const existingProfile = await prisma.profile.findUnique({
      where: { username },
    });

    if (existingProfile && existingProfile.userId !== userId) {
      return NextResponse.json({ error: "Username is already taken" }, { status: 400 });
    }

    // Update the profile in the database
    const updatedProfile = await prisma.profile.update({
      where: { userId },
      data: {
        username: username.toLowerCase().trim(),
        displayName: displayName.trim(),
        bio: bio ? bio.trim() : null,
      },
    });

    return NextResponse.json(updatedProfile);
  } catch (error: any) {
    console.error("[POST Update Profile Error]", error);
    return NextResponse.json({ error: error.message || "Failed to update profile" }, { status: 500 });
  }
}
