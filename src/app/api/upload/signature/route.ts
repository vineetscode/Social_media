/**
 * GET /api/upload/signature?folder=jabwemet/reels
 *
 * Generates a time-limited signed upload signature for direct client-to-Cloudinary uploads.
 * Used for large files (reels) to bypass the server — the client uploads directly to Cloudinary
 * using these short-lived credentials. The server never touches the video bytes.
 *
 * Security:
 *  - Requires Clerk auth
 *  - API secret stays on server — only signature hash is sent to client
 *  - Signature expires after 1 hour (Cloudinary default)
 *  - Folder is whitelisted to prevent uploads to arbitrary paths
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateSignedUploadParams, FOLDERS, type UploadFolder } from "@/lib/cloudinary";

const ALLOWED_FOLDERS = new Set<string>(Object.values(FOLDERS));

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const folder = (searchParams.get("folder") || FOLDERS.posts) as UploadFolder;

  // Whitelist check — prevent uploads to arbitrary Cloudinary folders
  if (!ALLOWED_FOLDERS.has(folder)) {
    return NextResponse.json({ error: "Invalid upload folder" }, { status: 400 });
  }

  try {
    const params = generateSignedUploadParams(folder);
    return NextResponse.json(params);
  } catch (error: any) {
    console.error("[Signature Error]", error);
    return NextResponse.json({ error: "Signature generation failed" }, { status: 500 });
  }
}
