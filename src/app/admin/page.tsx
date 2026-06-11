"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import NavigationShell from "@/components/navigation-shell";
import {
  Shield,
  Users,
  FileText,
  Tv,
  AlertTriangle,
  Check,
  X,
  Loader2,
  Lock,
  BarChart3,
} from "lucide-react";

interface Report {
  id: string;
  reason: string;
  status: "PENDING" | "RESOLVED" | "DISMISSED";
  createdAt: string;
  reporter?: { profile: { username: string; displayName: string } | null } | null;
  reported?: { profile: { username: string; displayName: string } | null } | null;
  post?: { id: string; caption: string } | null;
}
interface Metrics { totalUsers: number; totalPosts: number; totalReels: number; totalReports: number; }

export default function AdminPage() {
  const { user, isLoaded } = useUser();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [accessDenied, setAccessDenied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAdminData = () => {
    fetch("/api/admin")
      .then((res) => {
        if (res.status === 403) { setAccessDenied(true); setIsLoading(false); throw new Error("Access Denied"); }
        return res.json();
      })
      .then((data) => {
        if (data.metrics) setMetrics(data.metrics);
        if (data.reports) setReports(data.reports);
        setIsLoading(false);
      })
      .catch((err) => console.error("Admin fetch failed:", err));
  };

  useEffect(() => { if (isLoaded && user) fetchAdminData(); }, [isLoaded, user]);

  const handleModerationAction = async (reportId: string, action: "RESOLVE" | "DISMISS") => {
    setReports((prev) =>
      prev.map((r) => r.id === reportId ? { ...r, status: action === "RESOLVE" ? "RESOLVED" : "DISMISSED" } : r)
    );
    try {
      await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reportId, action }) });
      fetchAdminData();
    } catch (_) {}
  };

  if (!isLoaded || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center gap-4">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
        <span className="text-xs uppercase tracking-widest text-text-muted">Verifying Identity...</span>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <NavigationShell>
        <div className="flex items-center justify-center min-h-[80vh] p-6">
          <div className="w-full max-w-md p-8 rounded-4xl glass-card text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto animate-pulse">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black text-white tracking-tight">Access Denied</h2>
              <p className="text-xs text-text-secondary leading-relaxed">
                This dashboard requires Administrator privileges.
              </p>
            </div>
            <Link href="/feed" className="block w-full py-3 rounded-2xl bg-primary hover:bg-primary-hover text-white font-bold text-sm transition-all shadow-glow-sm">
              Return to Feed
            </Link>
          </div>
        </div>
      </NavigationShell>
    );
  }

  const METRIC_CARDS = [
    { label: "Total Users", value: metrics?.totalUsers ?? "—", icon: Users, color: "text-primary", bg: "bg-primary/10" },
    { label: "Total Posts", value: metrics?.totalPosts ?? "—", icon: FileText, color: "text-accent", bg: "bg-accent/10" },
    { label: "Total Reels", value: metrics?.totalReels ?? "—", icon: Tv, color: "text-primary-neon", bg: "bg-primary-neon/10" },
    { label: "Open Flags", value: metrics?.totalReports ?? "—", icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10" },
  ];

  return (
    <NavigationShell>
      <div className="max-w-4xl mx-auto w-full py-6 px-4 md:px-6 md:py-8 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" /> Moderation Dashboard
          </h1>
          <p className="text-xs text-text-muted mt-0.5">Review flagged content and monitor platform health.</p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
            <span className="section-label">Loading Dashboard...</span>
          </div>
        ) : (
          <>
            {/* Metrics Grid */}
            {metrics && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {METRIC_CARDS.map(({ label, value, icon: Icon, color, bg }) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-3xl glass-card flex flex-col gap-3"
                  >
                    <div className={`w-9 h-9 rounded-2xl ${bg} flex items-center justify-center ${color}`}>
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <p className="section-label">{label}</p>
                      <p className="text-3xl font-black text-white mt-1">{value}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Moderation Queue */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-text-muted" />
                <h3 className="section-label">Moderation Queue</h3>
              </div>

              {reports.length === 0 ? (
                <div className="text-center py-16 glass-card rounded-3xl flex flex-col items-center gap-4">
                  <Shield className="w-10 h-10 text-text-faint" />
                  <div>
                    <p className="text-text-secondary text-sm font-semibold">All clean!</p>
                    <p className="text-text-muted text-xs mt-1">No content reports in moderation queue.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.map((report) => (
                    <motion.div
                      key={report.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-5 rounded-3xl border glass-card flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                        report.status === "PENDING" ? "border-red-500/12 hover:border-red-500/22" : "opacity-50"
                      }`}
                    >
                      <div className="space-y-2 max-w-xl">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            report.status === "PENDING" ? "bg-red-500/10 text-red-400 border-red-500/20"
                              : report.status === "RESOLVED" ? "bg-accent/10 text-accent border-accent/20"
                              : "bg-white/5 text-text-secondary border-white/10"
                          }`}>
                            {report.status}
                          </span>
                          <span className="text-[10px] text-text-muted">
                            Filed {new Date(report.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </div>
                        <p className="text-xs text-white leading-relaxed">
                          <span className="font-bold">Reason:</span> "{report.reason}"
                        </p>
                        <div className="text-[10px] text-text-secondary flex flex-wrap gap-x-3 gap-y-1">
                          <span>Reporter: @{report.reporter?.profile?.username || "unknown"}</span>
                          {report.reported && <span>Target: @{report.reported.profile?.username}</span>}
                        </div>
                        {report.post && (
                          <div className="p-3 rounded-xl bg-white/4 border border-white/6 text-xs text-text-secondary italic leading-relaxed">
                            "{report.post.caption}"
                          </div>
                        )}
                      </div>

                      {report.status === "PENDING" && (
                        <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
                          <button
                            onClick={() => handleModerationAction(report.id, "DISMISS")}
                            title="Dismiss"
                            className="p-2.5 rounded-2xl glass-card hover:bg-white/8 text-white transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleModerationAction(report.id, "RESOLVE")}
                            title="Delete Content & Resolve"
                            className="p-2.5 rounded-2xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 transition-all"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </NavigationShell>
  );
}
