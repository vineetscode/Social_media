"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import NavigationShell from "@/components/navigation-shell";
import {
  Heart,
  MessageCircle,
  UserPlus,
  Bell,
  Check,
  Loader2,
  MessageSquare,
  AtSign,
} from "lucide-react";

interface Profile { username: string; displayName: string; avatarUrl?: string; }
interface Notification {
  id: string;
  type: "LIKE" | "COMMENT" | "FOLLOW" | "MESSAGE" | "MENTION";
  referenceId?: string;
  isRead: boolean;
  createdAt: string;
  sender?: { profile: Profile | null } | null;
}

const notifText = (type: Notification["type"]) => {
  const map: Record<Notification["type"], string> = {
    LIKE: "liked your post",
    COMMENT: "commented on your post",
    FOLLOW: "started following you",
    MESSAGE: "sent you a message",
    MENTION: "mentioned you in a caption",
  };
  return map[type] || "interacted with you";
};

const notifIcon = (type: Notification["type"]) => {
  const classes = "w-4 h-4";
  const map: Record<Notification["type"], React.ReactNode> = {
    LIKE: <Heart className={`${classes} text-accent-rose fill-accent-rose`} />,
    COMMENT: <MessageCircle className={`${classes} text-primary`} />,
    FOLLOW: <UserPlus className={`${classes} text-accent-cyan`} />,
    MESSAGE: <MessageSquare className={`${classes} text-primary-neon`} />,
    MENTION: <AtSign className={`${classes} text-accent-amber`} />,
  };
  return map[type] || <Bell className={`${classes} text-text-secondary`} />;
};

const notifColor = (type: Notification["type"]) => {
  const map: Record<Notification["type"], string> = {
    LIKE: "bg-accent-rose/10",
    COMMENT: "bg-primary/10",
    FOLLOW: "bg-accent-cyan/10",
    MESSAGE: "bg-primary-neon/10",
    MENTION: "bg-accent-amber/10",
  };
  return map[type] || "bg-white/5";
};

export default function NotificationsPage() {
  const { user, isLoaded } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isLoaded && user) {
      fetch("/api/notifications")
        .then((r) => r.json())
        .then((data) => { if (Array.isArray(data)) setNotifications(data); setIsLoading(false); })
        .catch(() => setIsLoading(false));
    }
  }, [isLoaded, user]);

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try { await fetch("/api/notifications", { method: "POST" }); } catch (_) {}
  };

  if (!isLoaded || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center gap-4">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
        <span className="text-xs uppercase tracking-widest text-text-muted">Loading...</span>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <NavigationShell>
      <div className="max-w-2xl mx-auto w-full py-6 px-4 md:px-6 md:py-8 space-y-5">

        {/* Header */}
        <div className="flex justify-between items-start sm:items-center">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Bell className="w-6 h-6 text-primary" />
              Notifications
              {unreadCount > 0 && (
                <span className="text-xs font-bold bg-primary text-white px-2 py-0.5 rounded-full ml-1">
                  {unreadCount}
                </span>
              )}
            </h1>
            <p className="text-xs text-text-muted mt-0.5">Your activity across JabWeMet.</p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl glass-card text-xs font-semibold text-white transition-all hover:bg-white/8 flex-shrink-0"
            >
              <Check className="w-3.5 h-3.5 text-accent" /> Mark all read
            </button>
          )}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
            <span className="section-label">Loading activity...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 glass-card rounded-3xl flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Bell className="w-7 h-7 text-text-faint" />
            </div>
            <div>
              <p className="text-text-secondary text-sm font-semibold">All caught up!</p>
              <p className="text-text-muted text-xs mt-1">No notifications yet. Post something to get the ball rolling!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {notifications.map((notif, idx) => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ delay: idx < 10 ? idx * 0.04 : 0 }}
                  className={`p-4 rounded-3xl flex items-center justify-between gap-4 border transition-all ${
                    notif.isRead
                      ? "glass-card text-text-secondary"
                      : "bg-white/4 border-primary/20 text-white shadow-sm shadow-primary/5"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    {/* Icon bubble */}
                    <div className={`w-9 h-9 rounded-2xl ${notifColor(notif.type)} flex items-center justify-center flex-shrink-0`}>
                      {notifIcon(notif.type)}
                    </div>

                    {/* Content */}
                    <div>
                      <p className="text-xs leading-relaxed">
                        <span className="font-bold text-white">
                          {notif.sender?.profile?.displayName || "Someone"}
                        </span>{" "}
                        {notifText(notif.type)}
                      </p>
                      <span className="text-[10px] text-text-muted">
                        {new Date(notif.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}{" "}
                        · {new Date(notif.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>

                  {/* Unread dot */}
                  {!notif.isRead && (
                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 animate-pulse" />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </NavigationShell>
  );
}
