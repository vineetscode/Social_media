"use client";

/**
 * ImageUploader — Universal image upload component for JabWeMet
 *
 * Used for: Post media, Profile avatar, Story images
 *
 * Features:
 *  - Drag & Drop + click-to-browse
 *  - Live preview before upload
 *  - Upload progress indicator
 *  - Client-side type/size validation (mirrors server-side)
 *  - Uploads via POST /api/upload/image
 *
 * Props:
 *  - type: "post" | "avatar" | "story"
 *  - onUploadComplete(url, publicId): callback with Cloudinary URL
 *  - onUploadError(error): optional error handler
 *  - className: optional wrapper class
 *  - previewShape: "square" | "circle" (default: "square")
 */

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, CheckCircle, AlertCircle, Image as ImageIcon, Loader2 } from "lucide-react";

const TYPE_LIMITS = {
  post:   { maxMB: 10, label: "Post Image",    accept: "image/jpeg,image/jpg,image/png,image/webp,image/gif" },
  avatar: { maxMB: 5,  label: "Profile Photo", accept: "image/jpeg,image/jpg,image/png,image/webp" },
  story:  { maxMB: 15, label: "Story",         accept: "image/jpeg,image/jpg,image/png,image/webp,image/gif" },
} as const;

interface ImageUploaderProps {
  type?: keyof typeof TYPE_LIMITS;
  onUploadComplete: (url: string, publicId: string) => void;
  onUploadError?: (error: string) => void;
  className?: string;
  previewShape?: "square" | "circle";
  placeholder?: string;
}

type UploadState = "idle" | "validating" | "uploading" | "success" | "error";

export default function ImageUploader({
  type = "post",
  onUploadComplete,
  onUploadError,
  className = "",
  previewShape = "square",
  placeholder,
}: ImageUploaderProps) {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const limits = TYPE_LIMITS[type];

  const handleError = (msg: string) => {
    setUploadState("error");
    setErrorMsg(msg);
    onUploadError?.(msg);
  };

  const processFile = useCallback(
    async (file: File) => {
      // Client-side pre-validation
      setUploadState("validating");
      setErrorMsg(null);

      if (!limits.accept.split(",").includes(file.type)) {
        return handleError(`Invalid file type. Use: ${limits.accept.replaceAll(",", ", ")}`);
      }
      if (file.size > limits.maxMB * 1024 * 1024) {
        return handleError(`File too large. Max ${limits.maxMB} MB`);
      }

      // Local preview
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      // Upload
      setUploadState("uploading");
      setProgress(0);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      try {
        // Use XHR for real upload progress tracking
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/upload/image");

          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              setProgress(Math.round((e.loaded / e.total) * 100));
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status === 201) {
              const data = JSON.parse(xhr.responseText);
              setUploadState("success");
              setProgress(100);
              onUploadComplete(data.url, data.publicId);
              resolve();
            } else {
              const data = JSON.parse(xhr.responseText);
              reject(new Error(data.error || "Upload failed"));
            }
          });

          xhr.addEventListener("error", () => reject(new Error("Network error")));
          xhr.send(formData);
        });
      } catch (err: any) {
        URL.revokeObjectURL(objectUrl);
        setPreviewUrl(null);
        handleError(err.message);
      }
    },
    [type, limits, onUploadComplete]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleReset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setUploadState("idle");
    setProgress(0);
    setErrorMsg(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const shapeClass = previewShape === "circle" ? "rounded-full" : "rounded-2xl";
  const isUploading = uploadState === "uploading" || uploadState === "validating";

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="file"
        accept={limits.accept}
        className="hidden"
        onChange={handleFileChange}
        disabled={isUploading}
      />

      {/* Upload Zone */}
      <div
        onClick={() => !isUploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative w-full aspect-square border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all duration-200 ${shapeClass} ${
          isDragging
            ? "border-primary bg-primary/10 scale-[1.02]"
            : uploadState === "success"
            ? "border-accent/40 bg-accent/5"
            : uploadState === "error"
            ? "border-accent-rose/40 bg-accent-rose/5"
            : "border-white/12 bg-white/3 hover:border-primary/40 hover:bg-white/5"
        }`}
      >
        {/* Preview image */}
        <AnimatePresence>
          {previewUrl && (
            <motion.img
              key="preview"
              src={previewUrl}
              alt="Preview"
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className={`absolute inset-0 w-full h-full object-cover ${shapeClass}`}
            />
          )}
        </AnimatePresence>

        {/* Overlay during upload */}
        <AnimatePresence>
          {isUploading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3"
            >
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <div className="text-center">
                <p className="text-xs font-bold text-white">{uploadState === "validating" ? "Validating..." : "Uploading..."}</p>
                {uploadState === "uploading" && (
                  <p className="text-[10px] text-white/60 mt-0.5">{progress}%</p>
                )}
              </div>
              {/* Progress bar */}
              <div className="w-2/3 h-1 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: "easeOut" }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success overlay */}
        <AnimatePresence>
          {uploadState === "success" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-2 right-2 bg-accent text-black rounded-full p-1"
            >
              <CheckCircle className="w-4 h-4" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Idle state placeholder */}
        {!previewUrl && !isUploading && (
          <div className="flex flex-col items-center gap-2 p-4 text-center select-none pointer-events-none">
            <div className={`w-10 h-10 rounded-2xl bg-white/8 flex items-center justify-center ${
              uploadState === "error" ? "bg-accent-rose/10" : ""
            }`}>
              {uploadState === "error" ? (
                <AlertCircle className="w-5 h-5 text-accent-rose" />
              ) : isDragging ? (
                <Upload className="w-5 h-5 text-primary animate-bounce" />
              ) : (
                <ImageIcon className="w-5 h-5 text-text-muted" />
              )}
            </div>
            <div>
              <p className="text-xs font-bold text-white">
                {uploadState === "error" ? "Upload failed" : placeholder || `Upload ${limits.label}`}
              </p>
              <p className="text-[10px] text-text-muted mt-0.5">
                {uploadState === "error"
                  ? errorMsg
                  : `Drag & drop or click · Max ${limits.maxMB} MB`}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Reset button */}
      {(previewUrl || uploadState !== "idle") && !isUploading && (
        <button
          onClick={(e) => { e.stopPropagation(); handleReset(); }}
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-background-elevated border border-white/15 flex items-center justify-center text-text-muted hover:text-white hover:border-white/30 transition-all z-10"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
