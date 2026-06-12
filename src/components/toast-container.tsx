"use client";

import { useToastStore } from "@/store/toast";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, AlertTriangle, Info, AlertOctagon } from "lucide-react";

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case "error":
        return <AlertOctagon className="w-5 h-5 text-rose-400" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      case "info":
      default:
        return <Info className="w-5 h-5 text-cyan-400" />;
    }
  };

  const getColorClasses = (type: string) => {
    switch (type) {
      case "success":
        return "bg-emerald-500/10 border-emerald-500/20 text-emerald-100 shadow-emerald-500/5";
      case "error":
        return "bg-rose-500/10 border-rose-500/20 text-rose-100 shadow-rose-500/5";
      case "warning":
        return "bg-amber-500/10 border-amber-500/20 text-amber-100 shadow-amber-500/5";
      case "info":
      default:
        return "bg-cyan-500/10 border-cyan-500/20 text-cyan-100 shadow-cyan-500/5";
    }
  };

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`flex items-start gap-3 p-4 rounded-2xl border backdrop-blur-xl shadow-lg pointer-events-auto overflow-hidden ${getColorClasses(
              toast.type
            )}`}
          >
            <div className="flex-shrink-0 mt-0.5">{getIcon(toast.type)}</div>
            <div className="flex-1 text-xs font-medium leading-relaxed font-sans text-left pr-2">
              {toast.message}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 text-white/40 hover:text-white transition-colors p-0.5 rounded-lg hover:bg-white/5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
