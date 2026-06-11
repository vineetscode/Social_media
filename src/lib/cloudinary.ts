/**
 * cloudinary.ts — Server-side Cloudinary SDK singleton + utility helpers
 *
 * Security model:
 *  - SDK is configured ONLY on the server (never imported in client code)
 *  - All uploads go through signed server-side API routes
 *  - API secret is never exposed to the browser
 *  - Upload limits enforced per media type
 */

import { v2 as cloudinary } from "cloudinary";

// ─── SDK CONFIGURATION ───────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Always use HTTPS URLs
});

export default cloudinary;

// ─── FOLDER STRUCTURE ────────────────────────────────────────────────────────
export const FOLDERS = {
  avatars: "jabwemet/avatars",
  posts: "jabwemet/posts",
  stories: "jabwemet/stories",
  reels: "jabwemet/reels",
} as const;

export type UploadFolder = (typeof FOLDERS)[keyof typeof FOLDERS];

// ─── UPLOAD LIMITS ───────────────────────────────────────────────────────────
export const UPLOAD_LIMITS = {
  image: {
    maxBytes: 10 * 1024 * 1024,       // 10 MB
    allowedTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"],
    transformations: { quality: "auto", fetch_format: "auto", crop: "limit", width: 2048 },
  },
  video: {
    maxBytes: 200 * 1024 * 1024,      // 200 MB
    allowedTypes: ["video/mp4", "video/webm", "video/quicktime"],
    transformations: { quality: "auto", video_codec: "auto" },
  },
  avatar: {
    maxBytes: 5 * 1024 * 1024,        // 5 MB
    allowedTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
    transformations: { quality: "auto", fetch_format: "auto", crop: "fill", gravity: "face", width: 400, height: 400, radius: "max" },
  },
  story: {
    maxBytes: 15 * 1024 * 1024,       // 15 MB
    allowedTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"],
    transformations: { quality: "auto", fetch_format: "auto", crop: "limit", width: 1080, height: 1920 },
  },
} as const;

// ─── TYPED UPLOAD RESULT ─────────────────────────────────────────────────────
export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  width?: number;
  height?: number;
  duration?: number;       // for videos
  format: string;
  resource_type: "image" | "video" | "raw";
  bytes: number;
  version: number;
}

// ─── UPLOAD IMAGE (server-side) ───────────────────────────────────────────────
export async function uploadImage(
  fileBuffer: Buffer,
  folder: UploadFolder,
  transformation: any = UPLOAD_LIMITS.image.transformations
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        transformation,
        resource_type: "image",
        overwrite: false,
        invalidate: true,
        // Strip EXIF metadata for privacy
        exif: false,
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Upload failed"));
        resolve(result as CloudinaryUploadResult);
      }
    );
    uploadStream.end(fileBuffer);
  });
}

// ─── UPLOAD VIDEO (server-side) ───────────────────────────────────────────────
export async function uploadVideo(
  fileBuffer: Buffer,
  folder: UploadFolder,
  transformation: any = UPLOAD_LIMITS.video.transformations
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "video",
        // Adaptive bitrate streaming for reels
        eager: [
          { streaming_profile: "hd", format: "m3u8" },
          { streaming_profile: "sd", format: "m3u8" },
        ],
        eager_async: true,
        overwrite: false,
        invalidate: true,
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Upload failed"));
        resolve(result as CloudinaryUploadResult);
      }
    );
    uploadStream.end(fileBuffer);
  });
}

// ─── DELETE ASSET (server-side) ───────────────────────────────────────────────
export async function deleteAsset(
  publicId: string,
  resourceType: "image" | "video" = "image"
): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType, invalidate: true });
}

// ─── GENERATE OPTIMIZED URL ───────────────────────────────────────────────────
export function getOptimizedImageUrl(
  publicId: string,
  options: { width?: number; height?: number; crop?: string } = {}
): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const { width = 800, height, crop = "limit" } = options;
  const transforms = [
    `q_auto`, `f_auto`, `c_${crop}`, `w_${width}`,
    height ? `h_${height}` : null,
  ].filter(Boolean).join(",");
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms}/${publicId}`;
}

export function getOptimizedVideoUrl(publicId: string): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  // Return HLS adaptive streaming manifest
  return `https://res.cloudinary.com/${cloudName}/video/upload/sp_hd/${publicId}.m3u8`;
}

export function getVideoThumbnailUrl(publicId: string, second = 0): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  return `https://res.cloudinary.com/${cloudName}/video/upload/q_auto,f_auto,so_${second},c_fill,w_540,h_960/${publicId}.jpg`;
}

// ─── GENERATE SIGNED UPLOAD SIGNATURE ────────────────────────────────────────
// Used for direct client-to-Cloudinary uploads (reduces server load for large files)
export function generateSignedUploadParams(folder: UploadFolder): {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  folder: string;
} {
  const timestamp = Math.round(Date.now() / 1000);
  const apiSecret = process.env.CLOUDINARY_API_SECRET!;
  const apiKey = process.env.CLOUDINARY_API_KEY!;
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;

  const paramsToSign = { timestamp, folder };
  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

  return { timestamp, signature, apiKey, cloudName, folder };
}

// ─── VALIDATE FILE ────────────────────────────────────────────────────────────
export function validateFile(
  mimeType: string,
  sizeBytes: number,
  mediaType: keyof typeof UPLOAD_LIMITS
): { valid: boolean; error?: string } {
  const limits = UPLOAD_LIMITS[mediaType];
  if (!(limits.allowedTypes as readonly string[]).includes(mimeType)) {
    return { valid: false, error: `Invalid file type. Allowed: ${limits.allowedTypes.join(", ")}` };
  }
  if (sizeBytes > limits.maxBytes) {
    const mb = (limits.maxBytes / 1024 / 1024).toFixed(0);
    return { valid: false, error: `File too large. Maximum size: ${mb} MB` };
  }
  return { valid: true };
}
