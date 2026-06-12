"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[APPLICATION ERROR BOUNDARY]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md p-6 rounded-3xl glass-card text-center border border-white/10 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8 text-rose-500" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-black text-white tracking-tight">Something went wrong</h1>
          <p className="text-xs text-text-muted leading-relaxed">
            An unexpected client-side error occurred. Details: {error.message || "Unknown rendering exception"}
          </p>
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-glow-sm flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" /> Try Again
          </button>
          <Link
            href="/feed"
            className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold hover:bg-white/10 transition-all flex items-center gap-1.5"
          >
            <Home className="w-4 h-4" /> Feed Home
          </Link>
        </div>
      </div>
    </div>
  );
}
