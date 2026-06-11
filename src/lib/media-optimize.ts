/**
 * media-optimize.ts — Client-side media optimization utilities for JabWeMet
 * 
 * Performs on-the-fly URL transformation for Cloudinary and Clerk images
 * to request appropriately scaled, compressed, and next-gen formatted (WebP/AVIF) assets.
 */

export function getOptimizedMediaUrl(url: string | undefined | null, size: number = 800): string {
  if (!url) return "";

  // 1. Cloudinary URL optimization
  if (url.includes("res.cloudinary.com")) {
    const uploadIndex = url.indexOf("/upload/");
    if (uploadIndex !== -1) {
      const prefix = url.substring(0, uploadIndex + 8);
      const suffix = url.substring(uploadIndex + 8);
      
      // Ensure we don't double-inject transformations
      if (!suffix.startsWith("q_") && !suffix.startsWith("w_")) {
        return `${prefix}q_auto,f_auto,w_${size},c_limit/${suffix}`;
      }
    }
  }

  // 2. Clerk Image URL optimization
  if (url.includes("img.clerk.com") || url.includes("images.clerk.dev")) {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}width=${size}&height=${size}&quality=85&fit=crop`;
  }

  return url;
}
