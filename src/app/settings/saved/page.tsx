"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import NavigationShell from "@/components/navigation-shell";
import { fetchWithRetry } from "@/lib/api-client";
import { getOptimizedMediaUrl } from "@/lib/media-optimize";
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  ChevronLeft,
  Loader2,
  FileText,
  AlertCircle,
} from "lucide-react";

interface Profile {
  username: string;
  displayName: string;
  avatarUrl?: string;
  isVerified?: boolean;
}

interface Author {
  profile: Profile | null;
}

interface Media {
  id: string;
  url: string;
  secureUrl: string;
  type: "IMAGE" | "VIDEO";
}

interface Post {
  id: string;
  caption: string | null;
  createdAt: string;
  author: Author;
  media?: Media[];
  likes?: { userId: string }[];
  _count: { likes: number; comments: number };
}

export default function SavedPostsPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Likes & share states
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);

  const fetchSavedPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithRetry("/api/feed?bookmarksOnly=true");
      if (res.ok) {
        const data = await res.json();
        setPosts(data);

        // Pre-populate likes dict
        const likes: Record<string, boolean> = {};
        data.forEach((p: Post) => {
          likes[p.id] = !!p.likes && p.likes.length > 0;
        });
        setLikedPosts(likes);
      } else {
        setError("Failed to retrieve bookmarked posts.");
      }
    } catch (err) {
      setError("Network connection error. Unable to load saved posts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSavedPosts();
  }, []);

  const handleToggleLike = async (postId: string) => {
    const isLiked = likedPosts[postId];
    setLikedPosts((prev) => ({ ...prev, [postId]: !isLiked }));
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const increment = isLiked ? -1 : 1;
          return { ...p, _count: { ...p._count, likes: p._count.likes + increment } };
        }
        return p;
      })
    );

    try {
      await fetchWithRetry("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
    } catch (error) {
      console.error("Failed to sync like:", error);
    }
  };

  const handleRemoveBookmark = async (postId: string) => {
    // Optimistically remove from list
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    try {
      await fetchWithRetry("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
    } catch (error) {
      console.error("Failed to unsave post:", error);
      fetchSavedPosts(); // Refetch to restore
    }
  };

  const handleSharePost = (postId: string) => {
    const url = `${window.location.origin}/post/${postId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedPostId(postId);
      setTimeout(() => setCopiedPostId(null), 2000);
    });
  };

  return (
    <NavigationShell>
      <div className="max-w-2xl mx-auto w-full py-6 px-4 md:px-6 md:py-8 space-y-6">
        
        {/* Back header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl hover:bg-white/5 text-text-secondary hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-accent" /> Saved Posts
            </h1>
            <p className="text-[10px] text-text-muted">Posts you saved for reading or viewing later.</p>
          </div>
        </div>

        {/* Dynamic content rendering */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-xs text-text-muted font-bold">Loading your saved vibe...</span>
          </div>
        ) : error ? (
          <div className="p-4 rounded-2xl bg-accent-rose/10 border border-accent-rose/25 text-accent-rose text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 glass-card rounded-3xl flex flex-col items-center gap-4 text-text-muted">
            <FileText className="w-10 h-10 text-text-faint animate-bounce" />
            <div className="space-y-2">
              <p className="text-sm font-semibold text-white">No Saved Posts</p>
              <p className="text-xs text-text-muted max-w-xs mx-auto">
                Find interesting content on your feed and click the bookmark icon to save it here!
              </p>
              <button
                onClick={() => router.push("/feed")}
                className="mt-4 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-glow-sm transition-all"
              >
                Go to Feed
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {posts.map((post, index) => {
                const isLiked = likedPosts[post.id];
                const hasMedia = post.media && post.media.length > 0;
                return (
                  <motion.div
                    key={post.id}
                    layout
                    initial={{ y: 25, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-5 rounded-3xl glass-card space-y-4 relative overflow-hidden"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex-shrink-0 flex items-center justify-center font-bold text-xs">
                          {post.author.profile?.avatarUrl ? (
                            <img
                              src={getOptimizedMediaUrl(post.author.profile.avatarUrl, 90)}
                              alt=""
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            <span>{post.author.profile?.displayName?.substring(0,1).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="text-left overflow-hidden">
                          <p className="text-xs font-bold text-white truncate">{post.author.profile?.displayName}</p>
                          <p className="text-[10px] text-text-muted truncate">@{post.author.profile?.username}</p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleRemoveBookmark(post.id)}
                        className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-red-500/10 hover:text-red-400 text-accent transition-all"
                        title="Un-save post"
                      >
                        <Bookmark className="w-4 h-4 fill-accent" />
                      </button>
                    </div>

                    {/* Caption */}
                    <p className="text-text-primary text-sm whitespace-pre-wrap leading-relaxed">
                      {post.caption}
                    </p>

                    {/* Image */}
                    {hasMedia && (
                      <div className="rounded-2xl overflow-hidden border border-white/5 bg-black/20 aspect-video w-full mt-2">
                        <img
                          src={getOptimizedMediaUrl(post.media![0].secureUrl || post.media![0].url, 800)}
                          alt="Post media"
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-5 pt-3 border-t border-white/5 text-text-muted text-sm">
                      <button
                        onClick={() => handleToggleLike(post.id)}
                        className={`flex items-center gap-1.5 transition-all group/btn ${isLiked ? "text-accent-rose font-semibold" : "hover:text-accent-rose"}`}
                      >
                        <Heart className={`w-4.5 h-4.5 transition-transform duration-200 group-hover/btn:scale-125 ${isLiked ? "fill-accent-rose stroke-accent-rose" : ""}`} />
                        <span className="text-xs">{post._count.likes}</span>
                      </button>
                      <button
                        onClick={() => router.push(`/feed`)} // navigate to feed to view comments
                        className="flex items-center gap-1.5 hover:text-primary transition-colors group/btn"
                      >
                        <MessageCircle className="w-4.5 h-4.5 transition-transform duration-200 group-hover/btn:scale-110" />
                        <span className="text-xs">{post._count.comments}</span>
                      </button>
                      <button
                        onClick={() => handleSharePost(post.id)}
                        className={`flex items-center gap-1.5 hover:text-accent-cyan transition-colors ml-auto group/btn ${copiedPostId === post.id ? "text-accent" : ""}`}
                      >
                        <Share2 className="w-4.5 h-4.5 transition-transform duration-200 group-hover/btn:scale-110" />
                        {copiedPostId === post.id && <span className="text-[10px] text-accent font-semibold">Copied!</span>}
                      </button>
                    </div>

                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

      </div>
    </NavigationShell>
  );
}
