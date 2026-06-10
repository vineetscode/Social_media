"use client";

/**
 * VideoUploader — Reel/video upload component for JabWeMet
 *
 * Features:
 *  - Drag & Drop + click-to-browse
 *  - Native <video> preview with play/pause
 *  - Real upload progress via XHR
 *  - Client-side type/size validation (mp4/webm/mov, ≤200MB)
 *  - Uploads via POST /api/upload/video
 *  - Returns both direct URL and HLS streaming URL
 */

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Play,
  Pause,
  Film,
  Loader2,
} from "lucide-react";

const MAX_VIDEO_MB = 200;
const ALLOWED_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

interface VideoUploaderProps {
  onUploadComplete: (data: {
    url: string;
    streamingUrl: string;
    thumbnailUrl: string;
    publicId: string;
    duration?: number;
  }) => void;
  onUploadError?: (error: string) => void;
  className?: string;
}

type UploadState = "idle" | "validating" | "uploading" | "success" | "error";

export default function VideoUploader({
  onUploadComplete,
  onUploadError,
  className = "",
}: VideoUploaderProps) {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleError = (msg: string) => {
    setUploadState("error");
    setErrorMsg(msg);
    onUploadError?.(msg);
  };

  const processFile = useCallback(
    async (file: File) => {
      setUploadState("validating");
      setErrorMsg(null);
      setFileName(file.name);

      // Validate type
      if (!ALLOWED_TYPES.includes(file.type)) {
        return handleError("Invalid format. Use: MP4, WebM, or MOV");
      }

      // Validate size
      if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
        return handleError(`File too large. Max ${MAX_VIDEO_MB} MB`);
      }

      // Local preview
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      // Upload via XHR for progress
      setUploadState("uploading");
      setProgress(0);

      const formData = new FormData();
      formData.append("file", file);

      try {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/upload/video");

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
              onUploadComplete({
                url: data.url,
                streamingUrl: data.streamingUrl,
                thumbnailUrl: data.thumbnailUrl,
                publicId: data.publicId,
                duration: data.duration,
              });
              resolve();
            } else {
              const data = JSON.parse(xhr.responseText);
              reject(new Error(data.error || "Upload failed"));
            }
          });

          xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
          xhr.send(formData);
        });
      } catch (err: any) {
        URL.revokeObjectURL(objectUrl);
        setPreviewUrl(null);
        handleError(err.message);
      }
    },
    [onUploadComplete]
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
    setFileName(null);
    setIsVideoPlaying(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isVideoPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsVideoPlaying(!isVideoPlaying);
  };

  const isUploading = uploadState === "uploading" || uploadState === "validating";

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={handleFileChange}
        disabled={isUploading}
      />

      {/* Drop zone */}
      <div
        onClick={() => !isUploading && !previewUrl && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative w-full rounded-3xl border-2 border-dashed overflow-hidden flex flex-col items-center justify-center transition-all duration-200 min-h-[240px] ${
          isDragging
            ? "border-accent bg-accent/10 scale-[1.01]"
            : uploadState === "success"
            ? "border-accent/30 bg-accent/5 cursor-default"
            : uploadState === "error"
            ? "border-accent-rose/30 bg-accent-rose/5 cursor-pointer"
            : previewUrl
            ? "border-white/10 cursor-default"
            : "border-white/12 bg-white/3 hover:border-primary/40 hover:bg-white/5 cursor-pointer"
        }`}
      >
        {/* Video preview */}
        {previewUrl && (
          <video
            ref={videoRef}
            src={previewUrl}
            className="absolute inset-0 w-full h-full object-cover"
            loop
            muted
            playsInline
            onEnded={() => setIsVideoPlaying(false)}
          />
        )}

        {/* Dark overlay on preview */}
        {previewUrl && <div className="absolute inset-0 bg-black/40 z-10" />}

        {/* Upload progress overlay */}
        <AnimatePresence>
          {isUploading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-4 z-20"
            >
              <Loader2 className="w-10 h-10 text-accent animate-spin" />
              <div className="text-center space-y-1">
                <p className="text-sm font-bold text-white">
                  {uploadState === "validating" ? "Validating..." : "Uploading Reel..."}
                </p>
                {uploadState === "uploading" && (
                  <p className="text-[11px] text-white/60">{progress}% · Processing for streaming...</p>
                )}
              </div>
              <div className="w-2/3 h-1.5 bg-white/15 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-accent rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: "easeOut" }}
                />
              </div>
              {fileName && (
                <p className="text-[10px] text-white/40 max-w-[200px] truncate">{fileName}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Play/Pause control (on preview, not uploading) */}
        {previewUrl && !isUploading && (
          <div className="relative z-20 flex flex-col items-center gap-3">
            <button
              onClick={togglePlay}
              className="w-14 h-14 rounded-full bg-black/50 border border-white/20 flex items-center justify-center text-white hover:bg-black/70 transition-all"
            >
              {isVideoPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
            </button>
            {uploadState === "success" && (
              <div className="flex items-center gap-1.5 bg-accent/90 text-black text-xs font-bold px-3 py-1.5 rounded-full">
                <CheckCircle className="w-3.5 h-3.5" /> Uploaded!
              </div>
            )}
          </div>
        )}

        {/* Idle / error state */}
        {!previewUrl && !isUploading && (
          <div className="flex flex-col items-center gap-3 p-6 text-center select-none pointer-events-none">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
              uploadState === "error" ? "bg-accent-rose/10" : "bg-white/8"
            }`}>
              {uploadState === "error" ? (
                <AlertCircle className="w-7 h-7 text-accent-rose" />
              ) : isDragging ? (
                <Upload className="w-7 h-7 text-accent animate-bounce" />
              ) : (
                <Film className="w-7 h-7 text-text-muted" />
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                {uploadState === "error" ? "Upload failed" : "Upload Reel"}
              </p>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                {uploadState === "error"
                  ? errorMsg
                  : "Drag & drop or click to browse\nMP4, WebM or MOV · Max 200 MB"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Reset / change button */}
      {(previewUrl || uploadState !== "idle") && !isUploading && (
        <button
          onClick={handleReset}
          className="absolute -top-2.5 -right-2.5 w-7 h-7 rounded-full bg-background-elevated border border-white/15 flex items-center justify-center text-text-muted hover:text-white hover:border-white/30 transition-all z-30"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
