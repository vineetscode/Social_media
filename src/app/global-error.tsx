"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GLOBAL ROOT ERROR BOUNDARY]", error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="bg-background text-text-primary antialiased min-h-screen font-sans flex items-center justify-center p-4">
        <div className="w-full max-w-md p-6 rounded-3xl glass-card text-center border border-white/10 space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8 text-rose-500" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-black text-white tracking-tight">Critical System Error</h1>
            <p className="text-xs text-text-muted leading-relaxed">
              A critical provider or root layout crash occurred. Details: {error.message || "Unknown system failure"}
            </p>
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => reset()}
              className="px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-glow-sm flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" /> Reload Application
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
