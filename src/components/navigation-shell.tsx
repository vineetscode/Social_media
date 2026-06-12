"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  MessageSquare,
  Compass,
  Bell,
  Search,
  Film,
  Shield,
  X,
  Menu,
  Zap,
  ChevronRight,
  User,
} from "lucide-react";
import { getOptimizedMediaUrl } from "@/lib/media-optimize";
import { useAppStore } from "@/store";
import { getSocket } from "@/lib/socket";
import { fetchWithRetry } from "@/lib/api-client";
import { useToastStore } from "@/store/toast";

interface UserMe {
  id: string;
  role: "USER" | "MODERATOR" | "ADMIN";
  profile?: {
    username: string;
    displayName: string;
    avatarUrl?: string;
    isVerified?: boolean;
  };
}

const NAV_LINKS = [
  { href: "/feed",          icon: Home,         label: "Feed" },
  { href: "/explore",       icon: Compass,      label: "Explore" },
  { href: "/reels",         icon: Film,         label: "Reels" },
  { href: "/chat",          icon: MessageSquare,label: "Messages" },
  { href: "/notifications", icon: Bell,         label: "Notifications" },
  { href: "/profile",       icon: User,         label: "Profile" },
];

const DOCK_LINKS = [
  { href: "/feed",          icon: Home,         label: "Home" },
  { href: "/explore",       icon: Compass,      label: "Explore" },
  { href: "/reels",         icon: Film,         label: "Reels" },
  { href: "/chat",          icon: MessageSquare,label: "Chat" },
  { href: "/profile",       icon: User,         label: "Profile" },
];

export default function NavigationShell({
  children,
  fullBleed = false,
}: {
  children: React.ReactNode;
  fullBleed?: boolean;
}) {
  const { user, isLoaded } = useUser();
  const pathname = usePathname();
  const [userMe, setUserMe] = useState<UserMe | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const {
    unreadNotificationsCount,
    unreadMessagesCount,
    countsLoaded,
    setCounts,
  } = useAppStore();

  const fetchUserMe = useCallback(async () => {
    try {
      const res = await fetchWithRetry("/api/users/me");
      if (res.ok) {
        const data = await res.json();
        setUserMe(data);
      }
    } catch (_) {}
  }, []);

  const fetchUnreadCounts = useCallback(async () => {
    try {
      const res = await fetchWithRetry("/api/unread-counts");
      if (res.ok) {
        const data = await res.json();
        setCounts(data.unreadNotifications || 0, data.unreadMessages || 0);
      }
    } catch (_) {}
  }, [setCounts]);

  // Fetch initial counts ONCE when component mounts
  useEffect(() => {
    if (isLoaded && user) {
      fetchUserMe();
      if (!countsLoaded) {
        fetchUnreadCounts();
      }
    }
  }, [isLoaded, user, fetchUserMe, fetchUnreadCounts, countsLoaded]);

  // Online/Offline network listeners
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      useToastStore.getState().addToast("You are back online!", "success");
    };

    const handleOffline = () => {
      useToastStore.getState().addToast("Connection lost. Running in offline mode.", "warning");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Real-time WebSockets setup for unread updates and online presence tracking
  useEffect(() => {
    if (isLoaded && user) {
      const socket = getSocket(user.id);
      socket.connect();

      const joinRoom = () => {
        console.log("[SOCKET CONNECT] Re-joining room...");
        socket.emit("join_room", { userId: user.id });
      };

      // Ensure joining room on connect (and reconnect)
      socket.on("connect", joinRoom);
      joinRoom(); // Call once initially

      // Track online users list
      socket.on("online_users", (users: string[]) => {
        useAppStore.getState().setOnlineUsers(users);
      });

      socket.on("new_message", (message: any) => {
        // Increment unread messages if not actively chatting with the sender
        const currentStore = useAppStore.getState();
        if (currentStore.activeRoomId !== message.senderId) {
          useAppStore.setState((prev) => ({
            unreadMessagesCount: prev.unreadMessagesCount + 1,
          }));

          // Push toast notification for the new message
          useToastStore.getState().addToast(
            `New message from ${message.senderName || "User"}: ${message.content}`,
            "info"
          );
        }
      });

      socket.on("new_notification", (notification: any) => {
        // Increment unread notifications
        useAppStore.setState((prev) => ({
          unreadNotificationsCount: prev.unreadNotificationsCount + 1,
        }));

        // Push toast notification
        useToastStore.getState().addToast(
          notification?.message || "You received a new notification!",
          "info"
        );
      });

      return () => {
        socket.off("connect", joinRoom);
        socket.off("online_users");
        socket.off("new_message");
        socket.off("new_notification");
        socket.disconnect();
      };
    }
  }, [isLoaded, user]);

  // Close drawer when navigating
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const isAdmin = userMe?.role === "ADMIN";

  const isActive = (href: string) => pathname === href;

  return (
    <div className="min-h-screen bg-background text-text-primary flex overflow-x-hidden gradient-mesh">
      {/* ─────────────────────────────────────────
          AMBIENT BACKGROUND GLOWS
      ───────────────────────────────────────── */}
      <div
        className="fixed top-[-15%] left-[-10%] w-[55%] h-[55%] rounded-full pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)",
        }}
      />
      <div
        className="fixed bottom-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(circle, rgba(16,185,129,0.04) 0%, transparent 70%)",
        }}
      />

      {/* ─────────────────────────────────────────
          DESKTOP / TABLET SIDEBAR
      ───────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col glass-sidebar h-screen sticky top-0 z-40 flex-shrink-0 transition-all duration-300 w-[70px] lg:w-[240px]">
        {/* Logo */}
        <div className="px-4 lg:px-6 pt-6 pb-4">
          <Link
            href="/"
            className="flex items-center gap-3 group"
          >
            {/* Logo icon */}
            <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0 shadow-glow-sm group-hover:shadow-glow-primary transition-shadow duration-300 relative">
              <Image
                src="/logo.jpg"
                alt="Logo"
                fill
                sizes="32px"
                className="object-cover"
                priority
              />
            </div>
            <span className="hidden lg:block text-lg font-black gradient-text truncate tracking-tight">
              JabWeMet
            </span>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 lg:px-4 space-y-1 overflow-y-auto scrollbar-none py-2" aria-label="Sidebar navigation">
          {NAV_LINKS.map(({ href, icon: Icon, label }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center justify-center lg:justify-start gap-3.5 px-3 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 group relative ${
                  active
                    ? "nav-item-active"
                    : "text-text-muted hover:text-text-primary hover:bg-white/5"
                }`}
              >
                <div className="relative flex items-center justify-center">
                  <Icon
                    className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                      active ? "text-primary" : ""
                    }`}
                  />
                  {label === "Notifications" && unreadNotificationsCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent-rose text-[9px] font-bold text-white shadow-[0_0_8px_rgba(244,63,94,0.5)] scale-90">
                      {unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}
                    </span>
                  )}
                  {label === "Messages" && unreadMessagesCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent-rose text-[9px] font-bold text-white shadow-[0_0_8px_rgba(244,63,94,0.5)] scale-90">
                      {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
                    </span>
                  )}
                </div>
                <span className="hidden lg:block truncate">{label}</span>
                {active && (
                  <motion.div
                    layoutId="sidebar-active-pill"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}

          {/* Admin link - shown only to admins/moderators */}
          {isAdmin && (
            <Link
              href="/admin"
              aria-current={isActive("/admin") ? "page" : undefined}
              className={`flex items-center justify-center lg:justify-start gap-3.5 px-3 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 group relative ${
                isActive("/admin")
                  ? "nav-item-active"
                  : "text-red-400/60 hover:text-red-400 hover:bg-red-500/5"
              }`}
            >
              <Shield
                className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                  isActive("/admin") ? "text-red-400" : ""
                }`}
              />
              <span className="hidden lg:block truncate">Moderation</span>
            </Link>
          )}
        </nav>

        {/* User Profile Bar */}
        <div className="px-3 lg:px-4 py-4">
          <Link
            href={`/profile/${userMe?.profile?.username || user?.username || ""}`}
            className="flex items-center justify-center lg:justify-start gap-3 p-2.5 rounded-2xl bg-white/3 border border-white/5 hover:bg-white/5 transition-colors duration-200 w-full"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 flex-shrink-0 bg-white/5 flex items-center justify-center">
              {userMe?.profile?.avatarUrl || user?.imageUrl ? (
                <img
                  src={getOptimizedMediaUrl(userMe?.profile?.avatarUrl || user?.imageUrl, 80)}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <User className="w-4 h-4 text-text-muted" />
              )}
            </div>
            <div className="hidden lg:block overflow-hidden flex-1 hover:opacity-80 transition-opacity text-left">
              <p className="text-xs font-bold text-text-primary truncate leading-tight">
                {user?.fullName || "—"}
              </p>
              <p className="text-[10px] text-text-muted truncate">
                @{userMe?.profile?.username || user?.username || "—"}
              </p>
            </div>
          </Link>
        </div>
      </aside>

      {/* ─────────────────────────────────────────
          MOBILE TOP HEADER
      ───────────────────────────────────────── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 glass-panel border-b border-white/5 py-3.5 px-5 flex justify-between items-center">
        {/* Hamburger / Menu button — opens drawer */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-2.5 group"
          aria-label="Open navigation menu"
          aria-expanded={drawerOpen}
          aria-haspopup="dialog"
        >
          <div className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center shadow-glow-sm relative">
            <Image
              src="/logo.jpg"
              alt="Logo"
              fill
              sizes="32px"
              className="object-cover"
              priority
            />
          </div>
          <span className="text-base font-black gradient-text tracking-tight">
            JabWeMet
          </span>
        </button>

        {/* Right side — user button */}
        <div className="flex items-center gap-3">
          <Link
            href={`/profile/${userMe?.profile?.username || user?.username || ""}`}
            className="w-8 h-8 rounded-full overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center hover:opacity-80 transition-opacity"
          >
            {userMe?.profile?.avatarUrl || user?.imageUrl ? (
              <img
                src={getOptimizedMediaUrl(userMe?.profile?.avatarUrl || user?.imageUrl, 80)}
                alt="Profile"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <User className="w-4 h-4 text-text-muted" />
            )}
          </Link>
        </div>
      </header>

      {/* ─────────────────────────────────────────
          MOBILE SLIDE-OUT DRAWER
      ───────────────────────────────────────── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="drawer-overlay md:hidden"
              onClick={() => setDrawerOpen(false)}
            />

            {/* Drawer panel */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 35 }}
              className="fixed top-0 left-0 bottom-0 w-[280px] glass-sidebar z-[70] flex flex-col md:hidden shadow-float"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center relative">
                    <Image
                      src="/logo.jpg"
                      alt="Logo"
                      fill
                      sizes="32px"
                      className="object-cover"
                      priority
                    />
                  </div>
                  <span className="text-lg font-black gradient-text tracking-tight">
                    JabWeMet
                  </span>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-2 rounded-xl hover:bg-white/5 text-text-muted hover:text-white transition-colors"
                  aria-label="Close navigation menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User profile card */}
              <div className="px-5 py-4 border-b border-white/5">
                <Link
                  href={`/profile/${userMe?.profile?.username || user?.username || ""}`}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-white/4 border border-white/5 hover:bg-white/6 transition-colors w-full"
                >
                  <div className="w-9 h-9 rounded-full overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center">
                    {userMe?.profile?.avatarUrl || user?.imageUrl ? (
                      <img
                        src={getOptimizedMediaUrl(userMe?.profile?.avatarUrl || user?.imageUrl, 90)}
                        alt="Profile"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <User className="w-4 h-4 text-text-muted" />
                    )}
                  </div>
                  <div className="overflow-hidden flex-1 text-left">
                    <p className="text-sm font-bold text-white truncate">
                      {user?.fullName || "—"}
                    </p>
                    <p className="text-[10px] text-text-muted truncate">
                      @{userMe?.profile?.username || user?.username || "—"}
                    </p>
                  </div>
                </Link>
              </div>

              {/* Drawer Navigation Links */}
              <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto scrollbar-none" aria-label="Drawer navigation">
                <p className="section-label px-3 mb-3">Navigation</p>
                {NAV_LINKS.map(({ href, icon: Icon, label }) => {
                  const active = isActive(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-200 group ${
                        active
                          ? "nav-item-active"
                          : "text-text-muted hover:text-text-primary hover:bg-white/5"
                      }`}
                    >
                      <div className="relative flex items-center justify-center">
                        <Icon
                          className={`w-5 h-5 flex-shrink-0 ${active ? "text-primary" : ""}`}
                        />
                        {label === "Notifications" && unreadNotificationsCount > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent-rose text-[9px] font-bold text-white shadow-[0_0_8px_rgba(244,63,94,0.5)] scale-90">
                            {unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}
                          </span>
                        )}
                        {label === "Messages" && unreadMessagesCount > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent-rose text-[9px] font-bold text-white shadow-[0_0_8px_rgba(244,63,94,0.5)] scale-90">
                            {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
                          </span>
                        )}
                      </div>
                      <span className="flex-1">{label}</span>
                      {active && (
                        <ChevronRight className="w-4 h-4 text-primary/60" />
                      )}
                    </Link>
                  );
                })}

                {isAdmin && (
                  <>
                    <p className="section-label px-3 pt-4 pb-2">Moderation</p>
                    <Link
                      href="/admin"
                      aria-current={isActive("/admin") ? "page" : undefined}
                      className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all ${
                        isActive("/admin")
                          ? "bg-red-500/10 border border-red-500/20 text-red-400"
                          : "text-red-400/60 hover:text-red-400 hover:bg-red-500/5"
                      }`}
                    >
                      <Shield className="w-5 h-5 flex-shrink-0" />
                      <span>Moderation Panel</span>
                    </Link>
                  </>
                )}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────
          MAIN CONTENT AREA
      ───────────────────────────────────────── */}
      <main
        className={`flex-1 min-h-screen relative z-10 ${
          fullBleed
            ? "pt-[57px] md:pt-0"
            : "pt-[57px] md:pt-0 pb-24 md:pb-0"
        }`}
      >
        {children}
      </main>

      {/* ─────────────────────────────────────────
          MOBILE FLOATING BOTTOM DOCK
      ───────────────────────────────────────── */}
      {!fullBleed && (
        <nav className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-3 py-2.5 rounded-[26px] glass-dock" aria-label="Mobile dock navigation">
          {DOCK_LINKS.map(({ href, icon: Icon, label }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className="relative flex flex-col items-center justify-center w-12 h-12 rounded-[18px] transition-all duration-200 group"
                aria-label={label}
              >
                {active && (
                  <motion.div
                    layoutId="dock-active-bg"
                    className="absolute inset-0 rounded-[18px] bg-primary/15 border border-primary/25"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <div className="relative flex items-center justify-center z-10">
                  <Icon
                    className={`w-5 h-5 transition-all duration-200 ${
                      active
                        ? "text-primary scale-110 drop-shadow-[0_0_6px_rgba(99,102,241,0.6)]"
                        : "text-text-muted group-hover:text-text-secondary group-hover:scale-105"
                    }`}
                  />
                  {label === "Chat" && unreadMessagesCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent-rose text-[9px] font-bold text-white shadow-[0_0_8px_rgba(244,63,94,0.5)] scale-90 z-20">
                      {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
