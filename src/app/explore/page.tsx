"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import NavigationShell from "@/components/navigation-shell";
import { getOptimizedMediaUrl } from "@/lib/media-optimize";
import {
  Heart,
  MessageCircle,
  Sparkles,
  UserPlus,
  UserMinus,
  Search,
  Loader2,
  TrendingUp,
  Award,
  X,
} from "lucide-react";

interface Profile {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  followerCount: number;
  isVerified?: boolean;
}

interface Author {
  profile: { username: string; displayName: string; avatarUrl?: string; isVerified?: boolean } | null;
}

interface Post {
  id: string;
  caption: string;
  createdAt: string;
  author: Author;
  _count: { likes: number; comments: number };
}

export default function ExplorePage() {
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState<"posts" | "creators">("posts");
  const [posts, setPosts] = useState<Post[]>([]);
  const [creators, setCreators] = useState<Profile[]>([]);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeHearts, setActiveHearts] = useState<Record<string, boolean>>({});

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ users: Profile[]; posts: Post[] }>({ users: [], posts: [] });
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!isLoaded || !user) return;

    // Fetch follows map
    fetch("/api/users/me")
      .then((res) => {
        if (res.ok) return res.json();
      })
      .then((data) => {
        if (data && data.following) {
          const map: Record<string, boolean> = {};
          data.following.forEach((item: any) => {
            map[item.followingId] = true;
          });
          setFollowingMap(map);
        }
      })
      .catch((err) => console.error("Explore page following fetch error:", err));

    // Fetch trending feed
    fetch("/api/explore")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load explore feed");
        return res.json();
      })
      .then((data) => {
        if (data.posts) {
          setPosts(data.posts);
          const initialLikes: Record<string, boolean> = {};
          data.posts.forEach((p: any) => {
            initialLikes[p.id] = p.likes && p.likes.length > 0;
          });
          setLikedPosts((prev) => ({ ...prev, ...initialLikes }));
        }
        if (data.creators) setCreators(data.creators);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [isLoaded, user]);

  // Debounced search logic
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ users: [], posts: [] });
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
          if (data.posts) {
            const initialLikes: Record<string, boolean> = {};
            data.posts.forEach((p: any) => {
              initialLikes[p.id] = p.likes && p.likes.length > 0;
            });
            setLikedPosts((prev) => ({ ...prev, ...initialLikes }));
          }
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const handleToggleLike = async (postId: string, forceLikeOnly = false) => {
    const isLiked = likedPosts[postId];
    if (forceLikeOnly && isLiked) return;
    setLikedPosts((prev) => ({ ...prev, [postId]: forceLikeOnly ? true : !isLiked }));
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const inc = forceLikeOnly ? (isLiked ? 0 : 1) : isLiked ? -1 : 1;
          return { ...p, _count: { ...p._count, likes: p._count.likes + inc } };
        }
        return p;
      })
    );
    // Also update search results posts if they match
    setSearchResults((prev) => ({
      ...prev,
      posts: prev.posts.map((p) => {
        if (p.id === postId) {
          const inc = forceLikeOnly ? (isLiked ? 0 : 1) : isLiked ? -1 : 1;
          return { ...p, _count: { ...p._count, likes: (p._count?.likes || 0) + inc } };
        }
        return p;
      }),
    }));
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
    const isFollowing = followingMap[creatorId];
    setFollowingMap((prev) => ({ ...prev, [creatorId]: !isFollowing }));
    setCreators((prev) =>
      prev.map((c) =>
        c.userId === creatorId ? { ...c, followerCount: c.followerCount + (isFollowing ? -1 : 1) } : c
      )
    );
    try {
      await fetch("/api/users/follow", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ followingId: creatorId }) });
    } catch (_) {}
  };

  if (!isLoaded || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center gap-4">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
        <span className="text-xs font-semibold uppercase tracking-widest text-text-muted">Loading Explore...</span>
      </div>
    );
  }

  return (
    <NavigationShell>
      <div className="max-w-4xl mx-auto w-full py-6 px-4 md:px-6 md:py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" /> Explore
            </h1>
            <p className="text-xs text-text-muted mt-0.5">Discover trending voices and hot posts in real-time.</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search users or posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2 rounded-2xl glass-card text-xs text-text-primary placeholder:text-text-muted outline-none border border-white/5 focus:border-primary/40 focus:ring-1 focus:ring-primary/40 transition-all bg-white/2"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-text-muted hover:text-white hover:bg-white/5 transition-all"
                aria-label="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {searchQuery.trim() !== "" ? (
          /* Search Results View */
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Search Results</h2>
              {isSearching && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
            </div>

            {/* Profiles matching */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">Accounts</h3>
              {searchResults.users.length === 0 && !isSearching ? (
                <p className="text-xs text-text-muted italic pl-1">No matching accounts found.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {searchResults.users.map((profile) => (
                    <Link
                      key={profile.userId}
                      href={`/profile/${profile.username}`}
                      className="p-4 rounded-3xl glass-card flex items-center gap-3 hover:bg-white/5 transition-all group"
                    >
                      {profile.avatarUrl ? (
                        <img
                          src={getOptimizedMediaUrl(profile.avatarUrl, 100)}
                          alt={profile.displayName}
                          className="w-11 h-11 rounded-full object-cover ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/30 to-primary-neon/20 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                          {profile.displayName.substring(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="overflow-hidden flex-1">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-white text-xs truncate group-hover:text-primary transition-colors">
                            {profile.displayName}
                          </span>
                          {profile.isVerified && (
                            <span className="text-primary text-[9px] bg-primary/10 px-1 rounded-full border border-primary/20">
                              ✓
                            </span>
                          )}
                        </div>
                        <p className="text-text-muted text-[10px] truncate">@{profile.username}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Posts matching */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider">Posts</h3>
              {searchResults.posts.length === 0 && !isSearching ? (
                <p className="text-xs text-text-muted italic pl-1">No matching posts found.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {searchResults.posts.map((post, idx) => {
                    const isLiked = likedPosts[post.id];
                    const hasPoppedHeart = activeHearts[post.id];
                    return (
                      <motion.div
                        key={post.id}
                        initial={{ opacity: 0, scale: 0.96 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.35, delay: idx < 4 ? idx * 0.05 : 0 }}
                        className="p-5 rounded-3xl glass-card space-y-4 relative overflow-hidden select-none cursor-pointer"
                        onDoubleClick={() => handleDoubleTap(post.id)}
                      >
                        <AnimatePresence>
                          {hasPoppedHeart && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/10 z-20 pointer-events-none">
                              <div className="text-red-500 text-5xl animate-heart-pop">💖</div>
                            </div>
                          )}
                        </AnimatePresence>
                        <div className="flex items-center gap-3">
                          {post.author?.profile?.avatarUrl ? (
                            <img
                              src={getOptimizedMediaUrl(post.author.profile.avatarUrl, 90)}
                              alt={post.author.profile.displayName}
                              className="w-9 h-9 rounded-full object-cover ring-2 ring-white/8"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-primary-neon/20 flex items-center justify-center text-primary font-bold text-xs">
                              {(post.author?.profile?.displayName || "U").substring(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-white text-xs">
                                {post.author?.profile?.displayName || "User"}
                              </span>
                              {post.author?.profile?.isVerified && (
                                <span className="text-primary text-[9px] bg-primary/10 px-1 rounded-full border border-primary/20">
                                  ✓
                                </span>
                              )}
                            </div>
                            <span className="text-text-muted text-[10px]">
                              @{post.author?.profile?.username || "user"}
                            </span>
                          </div>
                        </div>
                        <p className="text-text-primary text-xs line-clamp-3 leading-relaxed">{post.caption}</p>
                        <div className="flex items-center gap-4 pt-3 border-t border-white/5 text-text-muted text-xs">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleLike(post.id);
                            }}
                            className={`flex items-center gap-1 transition-colors ${
                              isLiked ? "text-accent-rose" : "hover:text-accent-rose"
                            }`}
                          >
                            <Heart className={`w-4 h-4 ${isLiked ? "fill-accent-rose stroke-accent-rose" : ""}`} />
                            {post._count?.likes || 0}
                          </button>
                          <div className="flex items-center gap-1">
                            <MessageCircle className="w-4 h-4" /> {post._count?.comments || 0}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Normal Explore Tabs */
          <>
            {/* Tab Selection */}
            <div className="flex gap-2 p-1.5 glass-card rounded-2xl w-fit">
              {[
                { key: "posts", icon: TrendingUp, label: "Trending Posts" },
                { key: "creators", icon: Award, label: "Hot Creators" },
              ].map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as any)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === key ? "bg-primary text-white shadow-glow-sm" : "text-text-muted hover:text-white"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </div>

            {/* Content */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-7 h-7 animate-spin text-primary" />
                <span className="section-label">Loading Discoveries...</span>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {activeTab === "posts" ? (
                  <motion.div
                    key="posts-grid"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                  >
                    {posts.length === 0 ? (
                      <div className="col-span-full text-center py-16 glass-card rounded-3xl text-text-muted text-sm">
                        No trending posts yet. Start interacting on your feed!
                      </div>
                    ) : (
                      posts.map((post, idx) => {
                        const isLiked = likedPosts[post.id];
                        const hasPoppedHeart = activeHearts[post.id];
                        return (
                          <motion.div
                            key={post.id}
                            initial={{ opacity: 0, scale: 0.96 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.35, delay: idx < 4 ? idx * 0.05 : 0 }}
                            className="p-5 rounded-3xl glass-card space-y-4 relative overflow-hidden select-none cursor-pointer"
                            onDoubleClick={() => handleDoubleTap(post.id)}
                          >
                            <AnimatePresence>
                              {hasPoppedHeart && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/10 z-20 pointer-events-none">
                                  <div className="text-red-500 text-5xl animate-heart-pop">💖</div>
                                </div>
                              )}
                            </AnimatePresence>
                            <div className="flex items-center gap-3">
                              {post.author.profile?.avatarUrl ? (
                                <img src={getOptimizedMediaUrl(post.author.profile.avatarUrl, 90)} alt={post.author.profile.displayName} className="w-9 h-9 rounded-full object-cover ring-2 ring-white/8" />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-primary-neon/20 flex items-center justify-center text-primary font-bold text-xs">
                                  {post.author.profile?.displayName.substring(0, 1).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="flex items-center gap-1">
                                  <span className="font-bold text-white text-xs">{post.author.profile?.displayName}</span>
                                  {post.author.profile?.isVerified && <span className="text-primary text-[9px] bg-primary/10 px-1 rounded-full border border-primary/20">✓</span>}
                                </div>
                                <span className="text-text-muted text-[10px]">@{post.author.profile?.username}</span>
                              </div>
                            </div>
                            <p className="text-text-primary text-xs line-clamp-3 leading-relaxed">{post.caption}</p>
                            <div className="flex items-center gap-4 pt-3 border-t border-white/5 text-text-muted text-xs">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleToggleLike(post.id); }}
                                className={`flex items-center gap-1 transition-colors ${isLiked ? "text-accent-rose" : "hover:text-accent-rose"}`}
                              >
                                <Heart className={`w-4 h-4 ${isLiked ? "fill-accent-rose stroke-accent-rose" : ""}`} />
                                {post._count.likes}
                              </button>
                              <div className="flex items-center gap-1">
                                <MessageCircle className="w-4 h-4" /> {post._count.comments}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="creators-grid"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                  >
                    {creators.length === 0 ? (
                      <div className="col-span-full text-center py-16 glass-card rounded-3xl text-text-muted text-sm">
                        No active creators found. Spread the word!
                      </div>
                    ) : (
                      creators.map((creator, idx) => {
                        const isFollowing = followingMap[creator.userId];
                        return (
                          <motion.div
                            key={creator.userId}
                            initial={{ opacity: 0, scale: 0.96 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.35, delay: idx < 6 ? idx * 0.05 : 0 }}
                            className="p-5 rounded-3xl glass-card flex flex-col items-center text-center space-y-4"
                          >
                            {creator.avatarUrl ? (
                              <img src={getOptimizedMediaUrl(creator.avatarUrl, 160)} alt={creator.displayName} className="w-16 h-16 rounded-full object-cover ring-2 ring-primary/25" />
                            ) : (
                              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/30 to-primary-neon/20 flex items-center justify-center text-primary font-black text-xl">
                                {creator.displayName.substring(0, 1).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="flex items-center justify-center gap-1">
                                <h3 className="font-bold text-white text-sm">{creator.displayName}</h3>
                                {creator.isVerified && <span className="text-primary text-[9px] bg-primary/10 border border-primary/20 px-1 rounded-full font-bold">VIP</span>}
                              </div>
                              <span className="text-text-muted text-xs">@{creator.username}</span>
                            </div>
                            <div className="text-[10px] text-text-secondary bg-white/5 border border-white/8 px-3 py-1 rounded-full">
                              <span className="font-bold text-white">{creator.followerCount}</span> followers
                            </div>
                            <button
                              onClick={() => handleToggleFollow(creator.userId)}
                              className={`w-full py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                isFollowing ? "bg-white/6 border border-white/10 text-white hover:bg-white/10" : "bg-primary text-white hover:bg-primary-hover shadow-glow-sm"
                              }`}
                            >
                              {isFollowing ? <><UserMinus className="w-3.5 h-3.5" /> Unfollow</> : <><UserPlus className="w-3.5 h-3.5" /> Follow</>}
                            </button>
                          </motion.div>
                        );
                      })
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </>
        )}
      </div>
    </NavigationShell>
  );
}
