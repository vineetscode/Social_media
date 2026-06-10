"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import NavigationShell from "@/components/navigation-shell";
import {
  Heart,
  MessageCircle,
  Search as SearchIcon,
  UserPlus,
  UserMinus,
  Loader2,
  X,
  Users,
  FileText,
} from "lucide-react";

interface Profile {
  userId: string; username: string; displayName: string; avatarUrl?: string;
  bio?: string; isVerified?: boolean;
}
interface Author {
  profile: { username: string; displayName: string; avatarUrl?: string; isVerified?: boolean } | null;
}
interface Post {
  id: string; caption: string; createdAt: string; author: Author;
  _count: { likes: number; comments: number };
}

export default function SearchPage() {
  const { user, isLoaded } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "creators" | "posts">("all");
  const [usersResults, setUsersResults] = useState<Profile[]>([]);
  const [postsResults, setPostsResults] = useState<Post[]>([]);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [isSearching, setIsSearching] = useState(false);
  const [activeHearts, setActiveHearts] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const h = setTimeout(() => setDebouncedQuery(searchQuery), 500);
    return () => clearTimeout(h);
  }, [searchQuery]);

  useEffect(() => {
    if (!debouncedQuery.trim()) { setUsersResults([]); setPostsResults([]); return; }
    setIsSearching(true);
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.users) setUsersResults(data.users);
        if (data.posts) setPostsResults(data.posts);
        setIsSearching(false);
      })
      .catch(() => setIsSearching(false));
  }, [debouncedQuery]);

  const handleToggleLike = async (postId: string, forceLikeOnly = false) => {
    const isLiked = likedPosts[postId];
    if (forceLikeOnly && isLiked) return;
    setLikedPosts((prev) => ({ ...prev, [postId]: forceLikeOnly ? true : !isLiked }));
    setPostsResults((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const inc = forceLikeOnly ? (isLiked ? 0 : 1) : isLiked ? -1 : 1;
          return { ...p, _count: { ...p._count, likes: p._count.likes + inc } };
        }
        return p;
      })
    );
    try {
      await fetch("/api/likes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId }) });
    } catch (_) {}
  };

  const handleDoubleTap = (postId: string) => {
    setActiveHearts((prev) => ({ ...prev, [postId]: true }));
    handleToggleLike(postId, true);
    setTimeout(() => setActiveHearts((prev) => ({ ...prev, [postId]: false })), 850);
  };

  const handleToggleFollow = async (creatorId: string) => {
    setFollowingMap((prev) => ({ ...prev, [creatorId]: !prev[creatorId] }));
    try {
      await fetch("/api/users/follow", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ followingId: creatorId }) });
    } catch (_) {}
  };

  if (!isLoaded || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center gap-4">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
        <span className="text-xs uppercase tracking-widest text-text-muted">Loading Search...</span>
      </div>
    );
  }

  return (
    <NavigationShell>
      <div className="max-w-3xl mx-auto w-full py-6 px-4 md:px-6 md:py-8 space-y-5">

        {/* Search Input */}
        <div className="relative">
          <SearchIcon className="w-5 h-5 text-text-faint absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users, hashtags (#genz), or captions..."
            className="w-full pl-12 pr-10 py-3.5 rounded-2xl glass-card text-white placeholder-text-faint text-sm input-glow transition-all duration-200"
            autoFocus
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-faint hover:text-white p-1 transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tabs */}
        {debouncedQuery.trim() && (
          <div className="flex gap-2 p-1.5 glass-card rounded-2xl w-fit">
            {[
              { key: "all", label: "All" },
              { key: "creators", icon: Users, label: "Creators" },
              { key: "posts", icon: FileText, label: "Posts" },
            ].map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === key ? "bg-primary text-white shadow-glow-sm" : "text-text-muted hover:text-white"
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />} {label}
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        {isSearching ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
            <span className="section-label">Searching the ecosystem...</span>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {!debouncedQuery.trim() ? (
              <div className="text-center py-20 glass-card rounded-3xl flex flex-col items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <SearchIcon className="w-7 h-7 text-text-faint" />
                </div>
                <div>
                  <p className="text-text-secondary text-sm font-semibold">Search JabWeMet</p>
                  <p className="text-text-muted text-xs mt-1">Find creators, posts, and hashtags.</p>
                </div>
              </div>
            ) : (
              <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                {/* Creator results */}
                {(activeTab === "all" || activeTab === "creators") && usersResults.length > 0 && (
                  <div className="space-y-2">
                    {activeTab === "all" && <p className="section-label pl-1">Creators</p>}
                    {usersResults.map((profile) => {
                      const isFollowing = followingMap[profile.userId];
                      return (
                        <div key={profile.userId} className="p-4 rounded-3xl glass-card flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary-neon/20 flex items-center justify-center text-primary font-bold text-sm">
                              {profile.displayName.substring(0, 1).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white text-sm">{profile.displayName}</span>
                                {profile.isVerified && <span className="text-primary text-[9px] bg-primary/10 border border-primary/20 px-1 rounded-full font-bold">✓</span>}
                              </div>
                              <span className="text-text-muted text-xs">@{profile.username}</span>
                              {profile.bio && <p className="text-[10px] text-text-secondary line-clamp-1 mt-0.5">{profile.bio}</p>}
                            </div>
                          </div>
                          <button
                            onClick={() => handleToggleFollow(profile.userId)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                              isFollowing ? "bg-white/6 border border-white/10 text-white hover:bg-white/10" : "bg-primary text-white hover:bg-primary-hover shadow-glow-sm"
                            }`}
                          >
                            {isFollowing ? <><UserMinus className="w-3.5 h-3.5" /> Unfollow</> : <><UserPlus className="w-3.5 h-3.5" /> Follow</>}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Post results */}
                {(activeTab === "all" || activeTab === "posts") && postsResults.length > 0 && (
                  <div className="space-y-3">
                    {activeTab === "all" && <p className="section-label pl-1 mt-4">Posts</p>}
                    {postsResults.map((post) => {
                      const isLiked = likedPosts[post.id];
                      const hasPoppedHeart = activeHearts[post.id];
                      return (
                        <div key={post.id} className="p-5 rounded-3xl glass-card space-y-4 relative overflow-hidden select-none cursor-pointer" onDoubleClick={() => handleDoubleTap(post.id)}>
                          <AnimatePresence>
                            {hasPoppedHeart && (
                              <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                                <div className="text-red-500 text-5xl animate-heart-pop">💖</div>
                              </div>
                            )}
                          </AnimatePresence>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-primary-neon/20 flex items-center justify-center text-primary font-bold text-xs">
                              {post.author.profile?.displayName.substring(0, 1).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-bold text-white text-xs">{post.author.profile?.displayName}</span>
                              <p className="text-text-muted text-[10px]">@{post.author.profile?.username}</p>
                            </div>
                          </div>
                          <p className="text-text-primary text-xs leading-relaxed">{post.caption}</p>
                          <div className="flex items-center gap-4 pt-3 border-t border-white/5 text-text-muted text-xs">
                            <button onClick={() => handleToggleLike(post.id)} className={`flex items-center gap-1 transition-colors ${isLiked ? "text-accent-rose" : "hover:text-accent-rose"}`}>
                              <Heart className={`w-4 h-4 ${isLiked ? "fill-accent-rose stroke-accent-rose" : ""}`} /> {post._count.likes}
                            </button>
                            <div className="flex items-center gap-1">
                              <MessageCircle className="w-4 h-4" /> {post._count.comments}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Empty state */}
                {usersResults.length === 0 && postsResults.length === 0 && (
                  <div className="text-center py-16 glass-card rounded-3xl text-text-muted text-sm">
                    No results found for "{debouncedQuery}"
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </NavigationShell>
  );
}
