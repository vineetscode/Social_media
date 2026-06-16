"use client";

import { useEffect, useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import NavigationShell from "@/components/navigation-shell";
import { getOptimizedMediaUrl } from "@/lib/media-optimize";
import { fetchWithRetry } from "@/lib/api-client";
import { Analytics } from "@/lib/analytics";
import { useAppStore } from "@/store";
import {
  Heart,
  MessageCircle,
  UserPlus,
  Edit,
  Loader2,
  Grid,
  Bookmark,
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
  UserCheck,
  Settings,
  LogOut,
  Lock,
  EyeOff,
  Ban,
} from "lucide-react";

interface ProfileDetails {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  website?: string;
  followerCount: number;
  followingCount: number;
  isVerified: boolean;
  isPrivate: boolean;
}

interface PostMedia {
  id: string;
  url: string;
  secureUrl: string;
  type: "IMAGE" | "VIDEO";
}

interface Post {
  id: string;
  caption: string | null;
  createdAt: string;
  media?: PostMedia[];
  _count: { likes: number; comments: number };
}

interface ProfileClientProps {
  initialProfile: ProfileDetails;
  initialPosts: Post[];
  initialIsFollowing: boolean;
  isSelf: boolean;
  targetUsername: string;
  isBlocked?: boolean;
  hasBlocked?: boolean;
}

export default function ProfileClient({
  initialProfile,
  initialPosts,
  initialIsFollowing,
  isSelf,
  targetUsername,
  isBlocked = false,
  hasBlocked = false,
}: ProfileClientProps) {
  const { signOut } = useClerk();
  const router = useRouter();
  const onlineUsers = useAppStore((state) => state.onlineUsers);

  // Track profile view on mount
  useEffect(() => {
    Analytics.trackClient("profile_viewed", { targetUsername, isSelf }).catch(() => {});
  }, [targetUsername, isSelf]);

  // States
  const [profile, setProfile] = useState<ProfileDetails>(initialProfile);
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [blockedState, setBlockedState] = useState(isBlocked);
  const [hasBlockedState, setHasBlockedState] = useState(hasBlocked);

  const handleToggleBlock = async () => {
    try {
      const res = await fetchWithRetry("/api/users/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: profile.userId })
      });
      if (res.ok) {
        const data = await res.json();
        setBlockedState(data.blocked);
        setHasBlockedState(data.blocked ? true : false);
        if (!data.blocked) {
          // Refresh data to fetch posts
          router.refresh();
        } else {
          setPosts([]);
          setIsFollowing(false);
          setProfile(prev => ({ ...prev, followerCount: Math.max(0, prev.followerCount - 1) }));
        }
      }
    } catch (err) {
      console.error("Block/unblock failed:", err);
    }
  };

  // Edit Profile States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUsername, setEditUsername] = useState(initialProfile.username || "");
  const [editDisplayName, setEditDisplayName] = useState(initialProfile.displayName || "");
  const [editBio, setEditBio] = useState(initialProfile.bio || "");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"posts" | "bookmarked">("posts");
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Post[]>([]);
  const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(false);

  const handleToggleFollow = async () => {
    const originalFollowing = isFollowing;
    setIsFollowing(!originalFollowing);
    setProfile((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        followerCount: prev.followerCount + (originalFollowing ? -1 : 1),
      };
    });

    try {
      const res = await fetchWithRetry("/api/users/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followingId: profile.userId }),
      });
      if (res.ok) {
        if (!originalFollowing) {
          Analytics.trackClient("follow_created", { followedUserId: profile.userId }).catch(() => {});
        } else {
          Analytics.trackClient("unfollow_created", { unfollowedUserId: profile.userId }).catch(() => {});
        }
      } else {
        // Revert
        setIsFollowing(originalFollowing);
        setProfile((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            followerCount: prev.followerCount + (originalFollowing ? 1 : -1),
          };
        });
      }
    } catch (err) {
      console.error(err);
      setIsFollowing(originalFollowing);
      setProfile((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          followerCount: prev.followerCount + (originalFollowing ? 1 : -1),
        };
      });
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingProfile) return;
    setIsSavingProfile(true);
    setEditError(null);
    setEditSuccess(false);

    try {
      const res = await fetchWithRetry("/api/users/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: editUsername,
          displayName: editDisplayName,
          bio: editBio,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setProfile((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            username: updated.username,
            displayName: updated.displayName,
            bio: updated.bio,
          };
        });
        setEditSuccess(true);
        setTimeout(() => {
          setShowEditModal(false);
          setEditSuccess(false);
          // If the username changed, redirect to the new profile page
          if (updated.username !== targetUsername) {
            window.location.href = `/profile/${updated.username}`;
          }
        }, 1000);
      } else {
        const errData = await res.json().catch(() => ({}));
        setEditError(errData.error || "Failed to update profile.");
      }
    } catch (err) {
      console.error(err);
      setEditError("Network error. Unable to save changes.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Tab switcher effect for fetching bookmarks
  useEffect(() => {
    if (activeTab === "bookmarked" && isSelf && bookmarkedPosts.length === 0) {
      setIsLoadingBookmarks(true);
      fetchWithRetry("/api/feed?bookmarksOnly=true")
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => {
          setBookmarkedPosts(data);
          setIsLoadingBookmarks(false);
        })
        .catch(() => setIsLoadingBookmarks(false));
    }
  }, [activeTab, isSelf, bookmarkedPosts.length]);

  return (
    <NavigationShell>
      <div className="max-w-4xl mx-auto w-full py-6 px-4 md:px-6 md:py-8 space-y-8">
        
        {/* 1. PROFILE HEADER SECTION */}
        <div className="flex flex-col md:flex-row gap-6 md:gap-12 items-center md:items-start border-b border-white/5 pb-8 relative">
          {/* Settings gear */}
          {isSelf && (
            <button
              onClick={() => setShowEditModal(true)}
              className="absolute top-0 right-0 p-2.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-text-muted hover:text-white transition-all shadow-glow-sm z-10"
              title="Settings & Sign Out"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}

          {/* Left: Avatar */}
          <div className="flex-shrink-0 relative">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full p-[3px] bg-gradient-to-tr from-primary via-primary-neon to-accent">
              {profile.avatarUrl ? (
                <img
                  src={getOptimizedMediaUrl(profile.avatarUrl, 240)}
                  alt={profile.displayName}
                  className="w-full h-full rounded-full object-cover border-4 border-background"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-background-elevated flex items-center justify-center text-primary font-black text-3xl border-4 border-background">
                  {profile.displayName.substring(0, 1).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          {/* Right: Info */}
          <div className="flex-1 space-y-4 text-center md:text-left w-full">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                @{profile.username}
                {onlineUsers.includes(profile.userId) && (
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" title="Online" />
                )}
                {profile.isVerified && (
                  <span className="text-[10px] font-bold bg-primary/15 text-primary border border-primary/20 px-2 py-0.5 rounded-full">
                    ✓ VIP
                  </span>
                )}
              </h1>

              <div className="flex gap-2 w-full sm:w-auto justify-center sm:justify-start">
                {isSelf ? (
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="px-4 py-2 rounded-xl bg-white/6 border border-white/10 text-white font-bold text-xs hover:bg-white/10 transition-all flex items-center gap-1.5 w-full sm:w-auto justify-center"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit Profile
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleToggleFollow}
                      disabled={blockedState}
                      className={`px-5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 w-full sm:w-auto justify-center ${
                        isFollowing
                          ? "bg-white/6 border border-white/10 text-white hover:bg-white/10"
                          : "bg-primary hover:bg-primary-hover text-white shadow-glow-sm disabled:opacity-50"
                      }`}
                    >
                      {isFollowing ? (
                        <>
                          <UserCheck className="w-3.5 h-3.5 text-accent" /> Following
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" /> Follow
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleToggleBlock}
                      className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 w-full sm:w-auto justify-center ${
                        blockedState && hasBlockedState
                          ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                          : "bg-accent-rose/10 border border-accent-rose/20 text-accent-rose hover:bg-accent-rose/20"
                      }`}
                    >
                      <Ban className="w-3.5 h-3.5" />
                      {blockedState && hasBlockedState ? "Unblock" : "Block"}
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-center md:justify-start gap-8 py-1.5 border-y border-white/5 md:border-none">
              <div className="text-center md:text-left">
                <span className="font-black text-white text-base">{posts.length}</span>{" "}
                <span className="text-text-muted text-xs">posts</span>
              </div>
              <div className="text-center md:text-left">
                <span className="font-black text-white text-base">{profile.followerCount}</span>{" "}
                <span className="text-text-muted text-xs">followers</span>
              </div>
              <div className="text-center md:text-left">
                <span className="font-black text-white text-base">{profile.followingCount}</span>{" "}
                <span className="text-text-muted text-xs">following</span>
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-sm font-bold text-white">{profile.displayName}</h2>
              {profile.bio ? (
                <p className="text-xs text-text-secondary whitespace-pre-wrap leading-relaxed max-w-md">
                  {profile.bio}
                </p>
              ) : (
                <p className="text-xs text-text-muted italic">No bio written yet.</p>
              )}
              {profile.website && (
                <a
                  href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary-neon font-bold hover:underline block"
                >
                  {profile.website}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* 2. TABS */}
        <div className="flex justify-center gap-6 border-b border-white/5 pb-0.5">
          <button
            onClick={() => setActiveTab("posts")}
            className={`pb-3 text-xs font-bold tracking-wider uppercase flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "posts"
                ? "border-primary text-white"
                : "border-transparent text-text-muted hover:text-white"
            }`}
          >
            <Grid className="w-3.5 h-3.5" /> Posts
          </button>
          {isSelf && (
            <button
              onClick={() => setActiveTab("bookmarked")}
              className={`pb-3 text-xs font-bold tracking-wider uppercase flex items-center gap-2 border-b-2 transition-all ${
                activeTab === "bookmarked"
                  ? "border-primary text-white"
                  : "border-transparent text-text-muted hover:text-white"
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" /> Bookmarks
            </button>
          )}
        </div>

        {/* 3. GRID */}
        <AnimatePresence mode="wait">
          {blockedState ? (
            <motion.div
              key="blocked-placeholder"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full text-center py-16 glass-card rounded-3xl flex flex-col items-center gap-4 text-text-muted"
            >
              {hasBlockedState ? (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                    <Ban className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-white">You Blocked This User</p>
                    <p className="text-xs text-text-muted max-w-xs mx-auto">
                      Unblock @{profile.username} to view their posts, reels, and start messaging.
                    </p>
                    <button
                      onClick={handleToggleBlock}
                      className="mt-4 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-glow-sm transition-all"
                    >
                      Unblock User
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-text-muted">
                    <EyeOff className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-white">Profile Unavailable</p>
                    <p className="text-xs text-text-muted max-w-xs mx-auto">
                      This user has blocked you or you do not have permission to view their profile.
                    </p>
                  </div>
                </>
              )}
            </motion.div>
          ) : !isSelf && profile.isPrivate && !isFollowing ? (
            <motion.div
              key="private-placeholder"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full text-center py-16 glass-card rounded-3xl flex flex-col items-center gap-4 text-text-muted"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Lock className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold text-white">This Account is Private</p>
                <p className="text-xs text-text-muted max-w-xs mx-auto">
                  Follow @{profile.username} to see their photos, videos, and updates.
                </p>
              </div>
            </motion.div>
          ) : activeTab === "posts" ? (
            <motion.div
              key="posts-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-3 gap-2 md:gap-4"
            >
              {posts.length === 0 ? (
                <div className="col-span-3 text-center py-20 glass-card rounded-3xl flex flex-col items-center gap-4 text-text-muted">
                  <FileText className="w-10 h-10 text-text-faint animate-bounce" />
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-white">No Posts Yet</p>
                    <p className="text-xs text-text-muted max-w-xs mx-auto">
                      {isSelf ? "Start sharing your vibe on the feed page!" : "This user has not posted anything."}
                    </p>
                    {isSelf && (
                      <button
                        onClick={() => router.push("/feed")}
                        className="mt-4 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-glow-sm transition-all"
                      >
                        Create Your First Post
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                posts.map((post) => {
                  const hasMedia = post.media && post.media.length > 0;
                  return (
                    <div
                      key={post.id}
                      className="aspect-square relative rounded-2xl overflow-hidden bg-background-elevated/40 border border-white/5 group cursor-pointer"
                    >
                      {hasMedia ? (
                        <img
                          src={getOptimizedMediaUrl(post.media![0].secureUrl || post.media![0].url, 400)}
                          alt="Post Content"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full p-4 flex flex-col justify-between bg-gradient-to-br from-white/3 to-white/5">
                          <p className="text-[10px] md:text-xs text-text-secondary leading-relaxed line-clamp-4 select-none">
                            {post.caption}
                          </p>
                          <span className="text-[8px] text-text-muted">Text Post</span>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-6 text-white font-bold text-sm z-10">
                        <div className="flex items-center gap-1.5">
                          <Heart className="w-4 h-4 fill-white text-white" />
                          <span>{post._count.likes}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MessageCircle className="w-4 h-4 fill-white text-white" />
                          <span>{post._count.comments}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </motion.div>
          ) : (
            <motion.div
              key="bookmarks-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-3 gap-2 md:gap-4"
            >
              {isLoadingBookmarks ? (
                <div className="col-span-3 text-center py-20 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="text-xs text-text-muted font-bold">Loading bookmarked posts...</span>
                </div>
              ) : bookmarkedPosts.length === 0 ? (
                <div className="col-span-3 text-center py-20 glass-card rounded-3xl flex flex-col items-center gap-4 text-text-muted">
                  <Bookmark className="w-10 h-10 text-text-faint animate-bounce" />
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-white">No Bookmarked Posts</p>
                    <p className="text-xs text-text-muted max-w-xs mx-auto">Saved posts will appear here. Find interesting content on your feed and save it for later.</p>
                    <button
                      onClick={() => router.push("/feed")}
                      className="mt-4 px-4 py-2 rounded-xl bg-white/6 border border-white/10 text-white font-bold text-xs hover:bg-white/10 transition-all"
                    >
                      Browse Feed
                    </button>
                  </div>
                </div>
              ) : (
                bookmarkedPosts.map((post) => {
                  const hasMedia = post.media && post.media.length > 0;
                  return (
                    <div
                      key={post.id}
                      className="aspect-square relative rounded-2xl overflow-hidden bg-background-elevated/40 border border-white/5 group cursor-pointer"
                    >
                      {hasMedia ? (
                        <img
                          src={getOptimizedMediaUrl(post.media![0].secureUrl || post.media![0].url, 400)}
                          alt="Post Content"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full p-4 flex flex-col justify-between bg-gradient-to-br from-white/3 to-white/5">
                          <p className="text-[10px] md:text-xs text-text-secondary line-clamp-4 select-none">
                            {post.caption}
                          </p>
                          <span className="text-[8px] text-text-muted">Text Post</span>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-6 text-white font-bold text-sm">
                        <div className="flex items-center gap-1.5">
                          <Heart className="w-4 h-4 fill-white text-white" />
                          <span>{post._count.likes}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MessageCircle className="w-4 h-4 fill-white text-white" />
                          <span>{post._count.comments}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit Profile Modal */}
        <AnimatePresence>
          {showEditModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-md bg-background-card border border-white/10 rounded-3xl p-6 relative shadow-2xl space-y-5"
              >
                <button
                  onClick={() => setShowEditModal(false)}
                  className="absolute top-4 right-4 p-2 rounded-xl hover:bg-white/5 text-text-secondary hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>

                <div>
                  <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                    <Settings className="w-5 h-5 text-primary" /> Settings & Profile
                  </h3>
                  <p className="text-xs text-text-muted">Update your details or end your login session.</p>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-4">
                  {editError && (
                    <div className="p-3.5 rounded-2xl bg-accent-rose/10 border border-accent-rose/25 text-accent-rose text-xs font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{editError}</span>
                    </div>
                  )}

                  {editSuccess && (
                    <div className="p-3.5 rounded-2xl bg-accent/10 border border-accent/20 text-accent text-xs font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                      <span>Profile saved successfully! Redirecting...</span>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="section-label">Username</label>
                    <input
                      type="text"
                      required
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      placeholder="username"
                      className="w-full px-4 py-3 rounded-2xl bg-background-elevated/50 border border-white/10 text-white placeholder-text-faint text-sm input-glow transition-all"
                    />
                    <p className="text-[10px] text-text-muted px-1 mt-0.5">
                      3-20 characters, lowercase letters, numbers, and underscores only.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="section-label">Display Name</label>
                    <input
                      type="text"
                      required
                      value={editDisplayName}
                      onChange={(e) => setEditDisplayName(e.target.value)}
                      placeholder="Display Name"
                      className="w-full px-4 py-3 rounded-2xl bg-background-elevated/50 border border-white/10 text-white placeholder-text-faint text-sm input-glow transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="section-label">Bio</label>
                    <textarea
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      placeholder="Tell us about yourself..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-2xl bg-background-elevated/50 border border-white/10 text-white placeholder-text-faint text-sm input-glow transition-all resize-none"
                    />
                  </div>

                  <div className="border-t border-white/5 pt-4 space-y-3">
                    <div className="flex gap-3 justify-end">
                      <button
                        type="button"
                        onClick={() => setShowEditModal(false)}
                        className="px-4 py-2 text-xs font-semibold text-text-secondary hover:text-white transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingProfile || editSuccess}
                        className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs disabled:opacity-60 transition-all flex items-center gap-1.5 shadow-glow-sm"
                      >
                        {isSavingProfile ? "Saving..." : "Save Changes"}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        await signOut();
                        router.push("/");
                      }}
                      className="w-full py-3 rounded-2xl bg-accent-rose/10 border border-accent-rose/25 text-accent-rose font-bold text-xs hover:bg-accent-rose/20 transition-all flex items-center justify-center gap-2"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out from Account
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </NavigationShell>
  );
}
