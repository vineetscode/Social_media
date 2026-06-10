/**
 * POST /api/upload/video
 *
 * Accepts multipart/form-data with a `file` field and optional `type`.
 * `type` can be: "reel" (defaults to "reel")
 *
 * Security:
 *  - Requires Clerk authentication
 *  - File type (mp4/webm/mov) and size (≤200MB) validated
 *  - Video transcoded and HLS streaming prepared via Cloudinary eager transforms
 *  - Returns both direct URL and HLS streaming manifest URL
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  FOLDERS,
  UPLOAD_LIMITS,
  uploadVideo,
  validateFile,
  getOptimizedVideoUrl,
  getVideoThumbnailUrl,
} from "@/lib/cloudinary";

export const runtime = "nodejs";

// Video uploads can be large — increase the timeout budget
export const maxDuration = 60; // seconds (Vercel max on Pro plan)

export async function POST(request: NextRequest) {
  // ── Auth check ──────────────────────────────────────────────────────────────
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // ── Validate file ─────────────────────────────────────────────────────────
    const validation = validateFile(file.type, file.size, "video");
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 422 });
    }

    // ── Convert to Buffer ─────────────────────────────────────────────────────
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ── Upload to Cloudinary (with HLS eager transform) ───────────────────────
    const result = await uploadVideo(buffer, FOLDERS.reels);

    const streamingUrl = getOptimizedVideoUrl(result.public_id);
    const thumbnailUrl = getVideoThumbnailUrl(result.public_id, 1);

    return NextResponse.json(
      {
        url: result.secure_url,         // Direct MP4 URL
        streamingUrl,                   // HLS .m3u8 manifest for adaptive streaming
        thumbnailUrl,                   // Auto-generated poster frame at 1s
        publicId: result.public_id,
        duration: result.duration,
        format: result.format,
        bytes: result.bytes,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Upload Video Error]", error);
    return NextResponse.json(
      { error: error.message || "Video upload failed" },
      { status: 500 }
    );
  }
}
