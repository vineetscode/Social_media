/**
 * POST /api/upload/image
 *
 * Accepts multipart/form-data with a `file` field and an optional `type` field.
 * `type` can be: "post" | "avatar" | "story" (defaults to "post")
 *
 * Security:
 *  - Requires Clerk authentication
 *  - File type and size validated before upload
 *  - API secret never exposed to client
 *  - EXIF stripped via Cloudinary options
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import cloudinary, {
  FOLDERS,
  UPLOAD_LIMITS,
  uploadImage,
  validateFile,
  type CloudinaryUploadResult,
} from "@/lib/cloudinary";
import { rateLimiter } from "@/lib/memory-rate-limiter";

export const runtime = "nodejs"; // Required: Cloudinary uses Node.js streams

export async function POST(request: NextRequest) {
  // ── Auth check ──────────────────────────────────────────────────────────────
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limiting: max 5 uploads per minute
  const limitCheck = await rateLimiter.rateLimit(`${userId}:uploads`, 60000, 5);
  if (!limitCheck.success) {
    return NextResponse.json(
      { error: "Too Many Requests", message: "You are uploading media too fast. Please wait a moment." },
      {
        status: 429,
        headers: { "Retry-After": Math.ceil((limitCheck.resetTime - Date.now()) / 1000).toString() }
      }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const uploadType = (formData.get("type") as string) || "post";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // ── Determine folder & transformation based on type ──────────────────────
    let folder: string;
    let transformation: any;
    let mediaType: keyof typeof UPLOAD_LIMITS;

    switch (uploadType) {
      case "avatar":
        folder = FOLDERS.avatars;
        transformation = UPLOAD_LIMITS.avatar.transformations;
        mediaType = "avatar";
        break;
      case "story":
        folder = FOLDERS.stories;
        transformation = UPLOAD_LIMITS.story.transformations;
        mediaType = "story";
        break;
      default: // "post"
        folder = FOLDERS.posts;
        transformation = UPLOAD_LIMITS.image.transformations;
        mediaType = "image";
    }

    // ── Validate file ─────────────────────────────────────────────────────────
    const validation = validateFile(file.name, file.type, file.size, mediaType);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 422 });
    }

    // ── Convert File to Buffer ────────────────────────────────────────────────
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ── Upload to Cloudinary ─────────────────────────────────────────────────
    const result = await uploadImage(buffer, folder as any, transformation);

    return NextResponse.json(
      {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Upload Image Error]", error);
    return NextResponse.json(
      { error: error.message || "Image upload failed" },
      { status: 500 }
    );
  }
}
