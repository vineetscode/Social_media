"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import NavigationShell from "@/components/navigation-shell";
import { fetchWithRetry } from "@/lib/api-client";
import { Analytics } from "@/lib/analytics";
import {
  User,
  Shield,
  Bell,
  Palette,
  Ban,
  Bookmark,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Lock,
  Globe,
} from "lucide-react";

interface BlockedUser {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

export default function SettingsPage() {
  const router = useRouter();

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<"account" | "privacy" | "notifications" | "appearance" | "blocked">("account");

  // Account State
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [website, setWebsite] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  // Notifications State (Local Storage persistent)
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [messageSoundEnabled, setMessageSoundEnabled] = useState(true);

  // Appearance State (Local Storage / Global Class list persistent)
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Blocked Users State
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);

  // Global UI status
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch Profile & settings values
  useEffect(() => {
    const fetchSettingsData = async () => {
      try {
        const res = await fetchWithRetry("/api/users/me");
        if (res.ok) {
          const data = await res.json();
          if (data.profile) {
            setUsername(data.profile.username || "");
            setDisplayName(data.profile.displayName || "");
            setBio(data.profile.bio || "");
            setWebsite(data.profile.website || "");
            setIsPrivate(data.profile.isPrivate || false);
          }
        }
      } catch (err) {
        console.error("Failed to fetch settings details", err);
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchSettingsData();

    // Pull local storage for Notifications and Appearance
    if (typeof window !== "undefined") {
      const storedPush = localStorage.getItem("settings_push_notifications");
      if (storedPush !== null) setPushEnabled(storedPush === "true");

      const storedEmail = localStorage.getItem("settings_email_notifications");
      if (storedEmail !== null) setEmailEnabled(storedEmail === "true");

      const storedSound = localStorage.getItem("settings_message_sound");
      if (storedSound !== null) setMessageSoundEnabled(storedSound === "true");

      const storedTheme = localStorage.getItem("settings_theme") as "dark" | "light";
      if (storedTheme) {
        setTheme(storedTheme);
      } else {
        const isDark = document.documentElement.classList.contains("dark");
        setTheme(isDark ? "dark" : "light");
      }
    }
  }, []);

  // Fetch Blocked users when tab shifts to blocked
  useEffect(() => {
    if (activeTab === "blocked") {
      setLoadingBlocked(true);
      fetchWithRetry("/api/users/block")
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          setBlockedUsers(data);
          setLoadingBlocked(false);
        })
        .catch(() => setLoadingBlocked(false));
    }
  }, [activeTab]);

  const showTemporarySuccess = (message: string) => {
    setSuccessMsg(message);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Save Account Profile
  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetchWithRetry("/api/users/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          displayName,
          bio,
          website,
        }),
      });

      if (res.ok) {
        showTemporarySuccess("Account settings saved successfully!");
        Analytics.trackClient("settings_profile_updated", { username }).catch(() => {});
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || "Failed to update account details.");
      }
    } catch (err) {
      setErrorMsg("Network error. Unable to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  // Save Privacy State
  const handleTogglePrivacy = async (privateVal: boolean) => {
    setIsPrivate(privateVal);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetchWithRetry("/api/users/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          displayName,
          bio,
          website,
          isPrivate: privateVal,
        }),
      });

      if (res.ok) {
        showTemporarySuccess(`Account is now ${privateVal ? "Private" : "Public"}`);
        Analytics.trackClient("settings_privacy_updated", { isPrivate: privateVal }).catch(() => {});
      } else {
        setIsPrivate(!privateVal); // revert
        setErrorMsg("Failed to update privacy settings.");
      }
    } catch (err) {
      setIsPrivate(!privateVal); // revert
      setErrorMsg("Network error. Could not toggle privacy.");
    }
  };

  // Save Notification toggles locally
  const handleTogglePush = (val: boolean) => {
    setPushEnabled(val);
    localStorage.setItem("settings_push_notifications", String(val));
    showTemporarySuccess("Push notification preferences updated");
  };

  const handleToggleEmail = (val: boolean) => {
    setEmailEnabled(val);
    localStorage.setItem("settings_email_notifications", String(val));
    showTemporarySuccess("Email preferences updated");
  };

  const handleToggleSound = (val: boolean) => {
    setMessageSoundEnabled(val);
    localStorage.setItem("settings_message_sound", String(val));
    showTemporarySuccess("Sound settings updated");
  };

  // Toggle Theme
  const handleThemeChange = (newTheme: "dark" | "light") => {
    setTheme(newTheme);
    localStorage.setItem("settings_theme", newTheme);
    
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    showTemporarySuccess(`Switched to ${newTheme === "dark" ? "Dark Mode" : "Light Mode"}`);
  };

  // Unblock a user
  const handleUnblock = async (targetUserId: string) => {
    try {
      const res = await fetchWithRetry("/api/users/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: targetUserId }),
      });

      if (res.ok) {
        setBlockedUsers((prev) => prev.filter((u) => u.userId !== targetUserId));
        showTemporarySuccess("User unblocked successfully!");
        Analytics.trackClient("user_unblocked", { targetUserId }).catch(() => {});
      } else {
        setErrorMsg("Failed to unblock user.");
      }
    } catch (err) {
      setErrorMsg("Error connecting to server to unblock.");
    }
  };

  if (loadingProfile) {
    return (
      <NavigationShell>
        <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span className="text-xs uppercase tracking-widest text-text-muted">Loading settings...</span>
        </div>
      </NavigationShell>
    );
  }

  return (
    <NavigationShell>
      <div className="max-w-4xl mx-auto w-full py-6 px-4 md:px-6 md:py-8 space-y-8">
        
        {/* Title */}
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Settings Center</h1>
          <p className="text-xs text-text-muted">Manage your account configurations, notifications, privacy, and bookmarks.</p>
        </div>

        {/* Dynamic Alerts */}
        <AnimatePresence>
          {successMsg && (
            <motion.div
              initial={{ height: 0, opacity: 0, y: -10 }}
              animate={{ height: "auto", opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: -10 }}
              className="p-3.5 rounded-2xl bg-accent/15 border border-accent/25 text-accent text-xs font-semibold flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </motion.div>
          )}

          {errorMsg && (
            <motion.div
              initial={{ height: 0, opacity: 0, y: -10 }}
              animate={{ height: "auto", opacity: 1, y: 0 }}
              exit={{ height: 0, opacity: 0, y: -10 }}
              className="p-3.5 rounded-2xl bg-accent-rose/15 border border-accent-rose/25 text-accent-rose text-xs font-semibold flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 animate-pulse" />
              <span>{errorMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          {/* Left Navigation Panel */}
          <aside className="md:col-span-1 space-y-1.5">
            {[
              { id: "account", label: "Account", icon: User },
              { id: "privacy", label: "Privacy", icon: Shield },
              { id: "notifications", label: "Notifications", icon: Bell },
              { id: "appearance", label: "Appearance", icon: Palette },
              { id: "blocked", label: "Blocked Users", icon: Ban },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setErrorMsg(null);
                  }}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                    active
                      ? "bg-primary/15 border border-primary/25 text-white"
                      : "text-text-muted hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? "text-primary animate-pulse" : ""}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}

            {/* Saved posts quicklink redirecting to saved posts */}
            <button
              onClick={() => router.push("/settings/saved")}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold text-text-muted hover:text-white hover:bg-white/5 transition-all mt-4 border border-dashed border-white/10"
            >
              <div className="flex items-center gap-3.5">
                <Bookmark className="w-4 h-4" />
                <span>Saved Posts</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-55" />
            </button>
          </aside>

          {/* Right Contents Container */}
          <main className="md:col-span-3 glass-card rounded-3xl p-6 md:p-8 space-y-6">
            <AnimatePresence mode="wait">
              
              {/* Account Settings */}
              {activeTab === "account" && (
                <motion.form
                  key="account-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSaveAccount}
                  className="space-y-4"
                >
                  <h2 className="text-sm font-black text-white uppercase tracking-wider">Account Settings</h2>
                  
                  <div className="space-y-1">
                    <label className="section-label">Username</label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Username"
                      className="w-full px-4 py-3 rounded-2xl bg-background-elevated/50 border border-white/10 text-white placeholder-text-faint text-xs input-glow transition-all"
                    />
                    <p className="text-[10px] text-text-muted px-1">Lowercase letters, numbers, and underscores only.</p>
                  </div>

                  <div className="space-y-1">
                    <label className="section-label">Display Name</label>
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Display Name"
                      className="w-full px-4 py-3 rounded-2xl bg-background-elevated/50 border border-white/10 text-white placeholder-text-faint text-xs input-glow transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="section-label">Bio</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell us about yourself..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-2xl bg-background-elevated/50 border border-white/10 text-white placeholder-text-faint text-xs input-glow transition-all resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="section-label">Website</label>
                    <input
                      type="text"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://yoursite.com"
                      className="w-full px-4 py-3 rounded-2xl bg-background-elevated/50 border border-white/10 text-white placeholder-text-faint text-xs input-glow transition-all"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs disabled:opacity-60 transition-all flex items-center gap-1.5 shadow-glow-sm"
                    >
                      {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </motion.form>
              )}

              {/* Privacy Settings */}
              {activeTab === "privacy" && (
                <motion.div
                  key="privacy-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-5"
                >
                  <h2 className="text-sm font-black text-white uppercase tracking-wider">Privacy Settings</h2>
                  
                  <div className="p-4 rounded-2xl bg-white/3 border border-white/5 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-white flex items-center gap-1.5">
                        {isPrivate ? <Lock className="w-3.5 h-3.5 text-primary" /> : <Globe className="w-3.5 h-3.5 text-accent" />}
                        Private Account
                      </p>
                      <p className="text-[10px] text-text-muted max-w-md leading-relaxed">
                        When your account is private, only users you approve can see your posts, reels, and stories. Your existing followers won&apos;t be affected.
                      </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer mt-1">
                      <input
                        type="checkbox"
                        checked={isPrivate}
                        onChange={(e) => handleTogglePrivacy(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </motion.div>
              )}

              {/* Notification Settings */}
              {activeTab === "notifications" && (
                <motion.div
                  key="notifications-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-5"
                >
                  <h2 className="text-sm font-black text-white uppercase tracking-wider">Notification Preferences</h2>

                  <div className="space-y-3.5">
                    {[
                      {
                        title: "Push Notifications",
                        desc: "Receive real-time desktop popups for likes, comments, and messages.",
                        checked: pushEnabled,
                        change: handleTogglePush,
                      },
                      {
                        title: "Email Digests",
                        desc: "Receive weekly highlights, follows, and messages recap to your email.",
                        checked: emailEnabled,
                        change: handleToggleEmail,
                      },
                      {
                        title: "Sound Effects",
                        desc: "Play sound alerts when receiving real-time direct messages.",
                        checked: messageSoundEnabled,
                        change: handleToggleSound,
                      },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/3 border border-white/5 gap-4">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-white">{item.title}</p>
                          <p className="text-[10px] text-text-muted max-w-sm leading-relaxed">{item.desc}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.checked}
                            onChange={(e) => item.change(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Appearance Settings */}
              {activeTab === "appearance" && (
                <motion.div
                  key="appearance-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-5"
                >
                  <h2 className="text-sm font-black text-white uppercase tracking-wider">Appearance settings</h2>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => handleThemeChange("dark")}
                      className={`p-5 rounded-2xl border text-left flex flex-col justify-between h-28 transition-all ${
                        theme === "dark"
                          ? "bg-primary/10 border-primary text-white shadow-glow-sm"
                          : "bg-white/3 border-white/5 text-text-muted hover:text-white"
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full bg-slate-900 border border-white/20" />
                      <div>
                        <p className="text-xs font-bold">Dark Theme</p>
                        <p className="text-[9px] mt-0.5 opacity-60">Sleek, battery-saving mode</p>
                      </div>
                    </button>

                    <button
                      onClick={() => handleThemeChange("light")}
                      className={`p-5 rounded-2xl border text-left flex flex-col justify-between h-28 transition-all ${
                        theme === "light"
                          ? "bg-primary/10 border-primary text-white shadow-glow-sm"
                          : "bg-white/3 border-white/5 text-text-muted hover:text-white"
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full bg-white border border-black/25" />
                      <div>
                        <p className="text-xs font-bold">Light Theme</p>
                        <p className="text-[9px] mt-0.5 opacity-60">Clean, high-contrast mode</p>
                      </div>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Blocked Users */}
              {activeTab === "blocked" && (
                <motion.div
                  key="blocked-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-5"
                >
                  <h2 className="text-sm font-black text-white uppercase tracking-wider">Blocked Users</h2>

                  {loadingBlocked ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    </div>
                  ) : blockedUsers.length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-white/10 rounded-2xl">
                      <p className="text-xs text-text-muted">You haven&apos;t blocked any users yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1 scrollbar-none">
                      {blockedUsers.map((u) => (
                        <div key={u.userId} className="flex items-center justify-between p-3 rounded-2xl bg-white/3 border border-white/5 gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-white/5 border border-white/10 flex-shrink-0 flex items-center justify-center font-bold text-xs">
                              {u.avatarUrl ? (
                                <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span>{u.displayName[0].toUpperCase()}</span>
                              )}
                            </div>
                            <div className="text-left overflow-hidden">
                              <p className="text-xs font-bold text-white truncate">{u.displayName}</p>
                              <p className="text-[10px] text-text-muted truncate">@{u.username}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleUnblock(u.userId)}
                            className="px-3.5 py-1.5 rounded-xl bg-white/6 hover:bg-white/10 text-white font-bold text-[10px] transition-all"
                          >
                            Unblock
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

            </AnimatePresence>
          </main>

        </div>

      </div>
    </NavigationShell>
  );
}
