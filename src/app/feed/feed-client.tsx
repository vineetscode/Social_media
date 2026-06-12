"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import NavigationShell from "@/components/navigation-shell";
import StoriesCarousel from "@/components/stories-carousel";
import ImageUploader from "@/components/image-uploader";
import { getOptimizedMediaUrl } from "@/lib/media-optimize";
import {
  Heart,
  MessageCircle,
  Share2,
  Sparkles,
  Image as ImageIcon,
  Smile,
  Send,
  UserPlus,
  Loader2,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Flag,
  X,
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
  isOptimistic?: boolean;
}

interface FeedClientProps {
  initialPosts: Post[];
  initialCursor: string | null;
  currentUser: {
    id: string;
    username: string;
    fullName: string;
    imageUrl: string;
  };
}

// ─── SKELETON LOADER COMPONENT ───
const PostSkeleton = () => (
  <div className="p-5 rounded-3xl glass-card space-y-4 animate-pulse">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-white/5" />
      <div className="space-y-2 flex-1">
        <div className="h-3 bg-white/10 rounded w-1/4" />
        <div className="h-2 bg-white/5 rounded w-1/6" />
      </div>
    </div>
    <div className="space-y-2">
      <div className="h-3 bg-white/5 rounded w-full" />
      <div className="h-3 bg-white/5 rounded w-5/6" />
    </div>
    <div className="h-48 bg-white/5 rounded-2xl w-full" />
    <div className="flex gap-4 pt-2">
      <div className="h-4 bg-white/5 rounded w-12" />
      <div className="h-4 bg-white/5 rounded w-12" />
    </div>
  </div>
);

export default function FeedClient({
  initialPosts,
  initialCursor,
  currentUser,
}: FeedClientProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [nextCursor, setNextCursor] = useState<string | null>(initialCursor);
  const [hasMore, setHasMore] = useState(!!initialCursor);
  const [isFeedLoading, setIsFeedLoading] = useState(false);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);

  const [inputText, setInputText] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState("");
  const [showImageUploader, setShowImageUploader] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [isComposerFocused, setIsComposerFocused] = useState(false);
  const [activeHearts, setActiveHearts] = useState<Record<string, boolean>>({});
  const [feedError, setFeedError] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [isComposerExpanded, setIsComposerExpanded] = useState(false);

  // Post Reporting States
  const [reportingPostId, setReportingPostId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Suggested Creators States
  const [suggestedCreators, setSuggestedCreators] = useState<any[]>([]);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});

  // Comments & Sharing States
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [postComments, setPostComments] = useState<Record<string, any[]>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [isSubmittingComment, setIsSubmittingComment] = useState<Record<string, boolean>>({});
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);

  const handleToggleComments = async (postId: string) => {
    const isExpanded = expandedComments[postId];
    setExpandedComments((prev) => ({ ...prev, [postId]: !isExpanded }));

    if (!isExpanded && !postComments[postId]) {
      setLoadingComments((prev) => ({ ...prev, [postId]: true }));
      try {
        const res = await fetch(`/api/comments?postId=${postId}`);
        if (res.ok) {
          const data = await res.json();
          setPostComments((prev) => ({ ...prev, [postId]: data }));
        }
      } catch (err) {
        console.error("Failed to load comments:", err);
      } finally {
        setLoadingComments((prev) => ({ ...prev, [postId]: false }));
      }
    }
  };

  const handleAddComment = async (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    const text = commentInputs[postId] || "";
    if (!text.trim() || isSubmittingComment[postId]) return;

    setIsSubmittingComment((prev) => ({ ...prev, [postId]: true }));
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, content: text }),
      });

      if (res.ok) {
        const newComment = await res.json();
        setPostComments((prev) => ({
          ...prev,
          [postId]: [...(prev[postId] || []), newComment],
        }));
        setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
        setPosts((prev) =>
          prev.map((p) => {
            if (p.id === postId) {
              return { ...p, _count: { ...p._count, comments: p._count.comments + 1 } };
            }
            return p;
          })
        );
      }
    } catch (err) {
      console.error("Failed to add comment:", err);
    } finally {
      setIsSubmittingComment((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleSharePost = (postId: string) => {
    const url = `${window.location.origin}/post/${postId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedPostId(postId);
      setTimeout(() => setCopiedPostId(null), 2000);
    });
  };

  useEffect(() => {
    if (!isComposerFocused) {
      setIsComposerExpanded(false);
    }
  }, [isComposerFocused]);

  // ─── CURSOR-BASED INFINITE SCROLL PAGINATION ───
  const fetchFeedPage = async (cursorVal?: string) => {
    if (cursorVal) {
      setIsFetchingNextPage(true);
    } else {
      setIsFeedLoading(true);
      setFeedError(null);
    }

    try {
      const url = cursorVal
        ? `/api/feed?limit=10&cursor=${cursorVal}`
        : `/api/feed?limit=10`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const incomingPosts = data.posts || [];
        const next = data.nextCursor || null;

        if (cursorVal) {
          setPosts((prev) => [...prev, ...incomingPosts]);
        } else {
          setPosts(incomingPosts);
        }
        setNextCursor(next);
        setHasMore(!!next);
      } else {
        const errData = await response.json().catch(() => ({}));
        setFeedError(errData.error || "Failed to load feed page.");
      }
    } catch (error) {
      console.error("Failed to load feed page:", error);
      setFeedError("Network connection error. Unable to load feed.");
    } finally {
      setIsFeedLoading(false);
      setIsFetchingNextPage(false);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const res = await fetch("/api/explore");
      if (res.ok) {
        const data = await res.json();
        if (data.creators) {
          const filtered = data.creators.filter((c: any) => c.userId !== currentUser.id);
          setSuggestedCreators(filtered.slice(0, 5));
        }
      }
    } catch (err) {
      console.error("Failed to fetch suggestions:", err);
    }
  };

  const fetchFollowings = async () => {
    try {
      const res = await fetch("/api/users/me");
      if (res.ok) {
        const data = await res.json();
        if (data.following) {
          const map: Record<string, boolean> = {};
          data.following.forEach((item: any) => {
            map[item.followingId] = true;
          });
          setFollowingMap(map);
        }
      }
    } catch (err) {
      console.error("Failed to fetch followings:", err);
    }
  };

  // Setup Observer for infinite scroll loading
  const observerRef = useRef<IntersectionObserver | null>(null);
  const bottomTriggerRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isFeedLoading || isFetchingNextPage || !hasMore) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && nextCursor) {
          fetchFeedPage(nextCursor);
        }
      });

      if (node) observerRef.current.observe(node);
    },
    [isFeedLoading, isFetchingNextPage, hasMore, nextCursor]
  );

  useEffect(() => {
    // Populate likes status from initial server posts
    const initialLikes: Record<string, boolean> = {};
    initialPosts.forEach((p) => {
      initialLikes[p.id] = !!p.likes && p.likes.length > 0;
    });
    setLikedPosts(initialLikes);

    fetchSuggestions();
    fetchFollowings();
  }, [initialPosts]);

  const handleToggleFollow = async (creatorId: string) => {
    const isFollowing = followingMap[creatorId];
    setFollowingMap((prev) => ({ ...prev, [creatorId]: !isFollowing }));
    try {
      await fetch("/api/users/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followingId: creatorId }),
      });
    } catch (error) {
      console.error("Failed to sync follow:", error);
    }
  };

  // ─── OPTIMISTIC POST RENDERING ───
  const handlePublishPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isPublishing) return;

    const tempPostId = `optimistic-${Date.now()}`;
    const optimisticPost: Post = {
      id: tempPostId,
      caption: inputText,
      createdAt: new Date().toISOString(),
      author: {
        profile: {
          username: currentUser.username,
          displayName: currentUser.fullName,
          avatarUrl: currentUser.imageUrl,
          isVerified: false,
        },
      },
      media: uploadedImageUrl
        ? [{ id: "temp-media", url: uploadedImageUrl, secureUrl: uploadedImageUrl, type: "IMAGE" }]
        : [],
      _count: { likes: 0, comments: 0 },
      isOptimistic: true,
    };

    // Prepend optimism post instantly to feed
    setPosts((prev) => [optimisticPost, ...prev]);

    setInputText("");
    setUploadedImageUrl("");
    setShowImageUploader(false);
    setShowEmojiPicker(false);
    setIsComposerFocused(false);

    setIsPublishing(true);
    setPublishError(null);

    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption: optimisticPost.caption, imageUrl: optimisticPost.media?.[0]?.url }),
      });
      if (response.ok) {
        const newPost = await response.json();
        const postWithAuthor: Post = {
          ...newPost,
          author: {
            profile: {
              username: currentUser.username,
              displayName: currentUser.fullName,
              avatarUrl: currentUser.imageUrl,
              isVerified: false,
            },
          },
          _count: { likes: 0, comments: 0 },
        };
        // Replace temp post with returned model
        setPosts((prev) => prev.map((p) => (p.id === tempPostId ? postWithAuthor : p)));
      } else {
        // Rollback optimistic element
        setPosts((prev) => prev.filter((p) => p.id !== tempPostId));
        const err = await response.json().catch(() => ({}));
        setPublishError(err.error || "Failed to publish post.");
      }
    } catch (error) {
      setPosts((prev) => prev.filter((p) => p.id !== tempPostId));
      setPublishError("Connection error. Could not publish post.");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleToggleLike = async (postId: string, forceLikeOnly = false) => {
    const isLiked = likedPosts[postId];
    if (forceLikeOnly && isLiked) return;
    setLikedPosts((prev) => ({ ...prev, [postId]: forceLikeOnly ? true : !isLiked }));
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const increment = forceLikeOnly ? (isLiked ? 0 : 1) : isLiked ? -1 : 1;
          return { ...p, _count: { ...p._count, likes: p._count.likes + increment } };
        }
        return p;
      })
    );
    try {
      await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId }),
      });
    } catch (error) {
      console.error("Failed to sync like:", error);
    }
  };

  const handleDoubleTap = (postId: string) => {
    setActiveHearts((prev) => ({ ...prev, [postId]: true }));
    handleToggleLike(postId, true);
    setTimeout(() => setActiveHearts((prev) => ({ ...prev, [postId]: false })), 850);
  };

  return (
    <NavigationShell>
      <div className="flex flex-col lg:flex-row max-w-5xl mx-auto w-full py-6 px-4 md:px-6 md:py-8 gap-8">
        <h1 className="sr-only">Feed | JabWeMet</h1>
        {/* Main Feed Column */}
        <div className="flex-1 space-y-5 min-w-0">
          {/* Stories */}
          <StoriesCarousel />

          {/* Composer */}
          <motion.div
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 120, damping: 18, delay: 0.05 }}
            className="p-5 rounded-3xl glass-card animate-border-flow"
          >
            <h2 className="section-label flex items-center gap-2 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-primary-glow" />
              Share your vibe
            </h2>
            <form onSubmit={handlePublishPost} className="space-y-3">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onFocus={() => setIsComposerFocused(true)}
                placeholder="What's on your mind? #creator #genz"
                className="w-full min-h-[72px] p-4 rounded-2xl bg-background-elevated/50 border border-white/8 text-white placeholder-text-faint focus:outline-none focus:border-primary/40 resize-none transition-all duration-300 text-sm leading-relaxed input-glow"
                required
              />
              {publishError && (
                <div className="p-3.5 rounded-2xl bg-accent-rose/10 border border-accent-rose/25 text-accent-rose text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{publishError}</span>
                </div>
              )}
              <AnimatePresence>
                {isComposerFocused && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onAnimationComplete={() => setIsComposerExpanded(true)}
                    className={`${isComposerExpanded ? "overflow-visible" : "overflow-hidden"} flex items-center justify-between pt-1`}
                  >
                    <div className="flex items-center gap-2 text-text-muted">
                      <button
                        type="button"
                        onClick={() => setShowImageUploader(!showImageUploader)}
                        className={`p-2 rounded-xl transition-colors ${showImageUploader ? "text-primary bg-primary/10" : "hover:text-primary hover:bg-primary/8"}`}
                        title="Attach image"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </button>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className={`p-2 rounded-xl transition-colors ${showEmojiPicker ? "text-primary bg-primary/10" : "hover:text-primary hover:bg-primary/8"}`}
                          title="Add emoji"
                        >
                          <Smile className="w-4 h-4" />
                        </button>
                        {showEmojiPicker && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} />
                            <div className="absolute bottom-full left-0 mb-2 p-3 bg-background-elevated/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 w-64 max-h-48 overflow-y-auto grid grid-cols-6 gap-2 scrollbar-none animate-in fade-in slide-in-from-bottom-2 duration-200">
                              {["😂", "😭", "💀", "🔥", "✨", "❤️", "👀", "🙌", "🥺", "🤔", "👍", "💯", "🚀", "😍", "😎", "🤣", "🥲", "🤭", "🥵", "🥶", "🤖", "🤡", "💩", "💸", "🎉", "🌟", "🍕", "🍺", "🤫", "💅", "🧠", "🎮", "🎧", "🌈", "🔮", "🛸"].map((emoji) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => {
                                    setInputText((prev) => prev + emoji);
                                    setShowEmojiPicker(false);
                                  }}
                                  className="text-xl hover:scale-125 active:scale-95 transition-transform p-1.5 rounded-lg hover:bg-white/5 flex items-center justify-center animate-in zoom-in-50 duration-150"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsComposerFocused(false);
                          setInputText("");
                        }}
                        className="px-4 py-2 text-xs font-semibold text-text-muted hover:text-white transition-colors rounded-xl"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isPublishing}
                        className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs disabled:opacity-50 transition-all shadow-glow-sm flex items-center gap-1.5"
                      >
                        {isPublishing ? "Posting..." : <><span>Publish</span> <Send className="w-3 h-3" /></>}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {/* Inline Cloudinary image uploader panel */}
              <AnimatePresence>
                {showImageUploader && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-3 space-y-2">
                      <p className="section-label">Attach image (optional)</p>
                      <ImageUploader
                        type="post"
                        onUploadComplete={(url) => setUploadedImageUrl(url)}
                        onUploadError={(err) => console.error("Post image error:", err)}
                        className="w-full"
                      />
                      {uploadedImageUrl && (
                        <p className="text-[10px] text-accent flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Image ready to attach
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {!isComposerFocused && (
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isPublishing}
                    className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs disabled:opacity-50 transition-all"
                  >
                    {isPublishing ? "Posting..." : "Post"}
                  </button>
                </div>
              )}
            </form>
          </motion.div>

          {/* Feed Error Banner */}
          {feedError && (
            <div className="p-5 rounded-3xl bg-accent-rose/10 border border-accent-rose/15 text-accent-rose text-sm font-semibold flex items-center gap-3 shadow-glass animate-in fade-in slide-in-from-top-4 duration-300">
              <AlertCircle className="w-5 h-5 flex-shrink-0 animate-pulse" />
              <div className="flex-1 text-xs sm:text-sm">
                <p className="font-black text-white">Out of Service</p>
                <p className="text-text-muted mt-0.5 font-normal">
                  Sorry for the inconvenience. We are experiencing a temporary network issue. Please check back shortly.
                </p>
              </div>
              <button
                onClick={() => fetchFeedPage()}
                className="px-4 py-2 rounded-xl bg-accent-rose/20 hover:bg-accent-rose/30 text-white text-xs font-bold transition-all"
              >
                Retry
              </button>
            </div>
          )}

          {/* SKELETON LOADER FOR INITIAL EMPTY PAGE FILLS */}
          {isFeedLoading && posts.length === 0 && (
            <div className="space-y-4">
              <PostSkeleton />
              <PostSkeleton />
              <PostSkeleton />
            </div>
          )}

          {/* Posts List */}
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {posts.map((post, index) => {
                const isLiked = likedPosts[post.id];
                const hasPoppedHeart = activeHearts[post.id];
                return (
                  <motion.div
                    key={post.id}
                    layout
                    initial={{ y: 40, opacity: 0, scale: 0.97 }}
                    whileInView={{ y: 0, opacity: 1, scale: 1 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ type: "spring", stiffness: 100, damping: 16, delay: index < 3 ? index * 0.08 : 0 }}
                    className={`p-5 rounded-3xl glass-card space-y-4 relative overflow-hidden group select-none ${post.isOptimistic ? "opacity-60" : ""}`}
                    onDoubleClick={() => !post.isOptimistic && handleDoubleTap(post.id)}
                  >
                    <AnimatePresence>
                      {hasPoppedHeart && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/10 z-20 pointer-events-none">
                          <div className="text-red-500 text-6xl drop-shadow-lg animate-heart-pop">💖</div>
                        </div>
                      )}
                    </AnimatePresence>

                    {/* Post header */}
                    <div className="flex items-center justify-between">
                      <Link href={`/profile/${post.author.profile?.username}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        {post.author.profile?.avatarUrl ? (
                          <img
                            src={getOptimizedMediaUrl(post.author.profile.avatarUrl, 100)}
                            alt={post.author.profile.displayName}
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-white/8"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary-neon/20 flex items-center justify-center text-primary font-bold text-sm ring-2 ring-white/8">
                            {post.author.profile?.displayName.substring(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white text-sm">
                              {post.author.profile?.displayName}
                            </span>
                            {post.author.profile?.isVerified && (
                              <span className="text-[9px] font-bold bg-primary/15 text-primary border border-primary/20 px-1.5 py-0.5 rounded-full">
                                ✓ Creator
                              </span>
                            )}
                          </div>
                          <span className="text-text-muted text-[11px] block text-left">
                            @{post.author.profile?.username}
                          </span>
                        </div>
                      </Link>
                      <div className="flex items-center gap-2">
                        {post.isOptimistic ? (
                          <span className="text-[10px] text-text-faint italic flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" /> Publishing...
                          </span>
                        ) : (
                          <span className="text-text-faint text-[11px]">
                            {new Date(post.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          </span>
                        )}
                        {!post.isOptimistic && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setReportingPostId(post.id);
                            }}
                            className="p-1 text-text-muted hover:text-red-400 transition-colors rounded-lg hover:bg-white/5"
                            title="Report post"
                          >
                            <Flag className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Caption */}
                    <p className="text-text-primary text-sm whitespace-pre-wrap leading-relaxed">
                      {post.caption}
                    </p>

                    {/* Post media (if exists) */}
                    {post.media && post.media.length > 0 && (
                      <div className="rounded-2xl overflow-hidden border border-white/5 bg-black/20 aspect-video w-full mt-2">
                        <img
                          src={getOptimizedMediaUrl(post.media[0].secureUrl || post.media[0].url, 800)}
                          alt="Post media"
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}

                    {/* Action bar */}
                    {!post.isOptimistic && (
                      <div className="flex items-center gap-5 pt-3 border-t border-white/5 text-text-muted text-sm">
                        <button
                          onClick={() => handleToggleLike(post.id)}
                          className={`flex items-center gap-1.5 transition-all group/btn ${isLiked ? "text-accent-rose font-semibold" : "hover:text-accent-rose"}`}
                        >
                          <Heart className={`w-4.5 h-4.5 transition-transform duration-200 group-hover/btn:scale-125 ${isLiked ? "fill-accent-rose stroke-accent-rose" : ""}`} />
                          <span className="text-xs">{post._count.likes}</span>
                        </button>
                        <button
                          onClick={() => handleToggleComments(post.id)}
                          className={`flex items-center gap-1.5 hover:text-primary transition-colors group/btn ${expandedComments[post.id] ? "text-primary font-semibold" : ""}`}
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
                    )}

                    {/* Collapsible Comments Section */}
                    {expandedComments[post.id] && (
                      <div className="mt-4 pt-4 border-t border-white/5 space-y-4 animate-float-up">
                        {/* Comments list */}
                        <div className="space-y-3 max-h-60 overflow-y-auto pr-1 scrollbar-none">
                          {loadingComments[post.id] ? (
                            <div className="flex justify-center py-4">
                              <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            </div>
                          ) : !postComments[post.id] || postComments[post.id].length === 0 ? (
                            <p className="text-xs text-text-muted italic text-center py-2">No comments yet. Start the conversation!</p>
                          ) : (
                            postComments[post.id].map((comment) => (
                              <div key={comment.id} className="flex items-start gap-2.5 text-xs text-text-secondary leading-relaxed font-sans">
                                <div className="w-6 h-6 rounded-full overflow-hidden border border-white/10 bg-white/5 flex-shrink-0 flex items-center justify-center">
                                  {comment.author?.profile?.avatarUrl ? (
                                    <img src={comment.author.profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-[9px] font-bold">{comment.author?.profile?.displayName?.substring(0, 1).toUpperCase() || "U"}</span>
                                  )}
                                </div>
                                <div className="flex-1 bg-white/3 rounded-2xl px-3 py-2 border border-white/5">
                                  <p className="font-bold text-white text-[11px] mb-0.5">
                                    @{comment.author?.profile?.username || "user"}
                                  </p>
                                  <p className="break-words">{comment.content}</p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Comment input form */}
                        <form onSubmit={(e) => handleAddComment(e, post.id)} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={commentInputs[post.id] || ""}
                            onChange={(e) => setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))}
                            placeholder="Add a comment..."
                            className="flex-1 bg-white/3 border border-white/10 rounded-2xl px-4 py-2 text-xs text-white placeholder-text-faint focus:outline-none focus:border-primary/50 transition-colors"
                          />
                          <button
                            type="submit"
                            disabled={!(commentInputs[post.id] || "").trim() || isSubmittingComment[post.id]}
                            className="px-4 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-2xl text-xs font-bold transition-all shadow-glow-sm"
                          >
                            {isSubmittingComment[post.id] ? "..." : "Post"}
                          </button>
                        </form>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {posts.length === 0 && !isFeedLoading && (
              <div className="text-center py-20 glass-card rounded-3xl flex flex-col items-center gap-4">
                <AlertCircle className="w-10 h-10 text-text-faint" />
                <div>
                  <p className="text-text-secondary text-sm font-semibold">Your feed is empty</p>
                  <p className="text-text-muted text-xs mt-1">Write your first post above or follow some creators!</p>
                </div>
              </div>
            )}

            {/* Bottom loader trigger for infinite scroll */}
            {hasMore && nextCursor && (
              <div ref={bottomTriggerRef} className="h-20 flex items-center justify-center">
                {isFetchingNextPage && <Loader2 className="w-6 h-6 animate-spin text-primary" />}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar — Desktop only */}
        <div className="hidden lg:block w-72 space-y-5 flex-shrink-0">
          <div className="glass-card rounded-3xl p-5 space-y-4 sticky top-8">
            <h2 className="section-label flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-accent" /> Creators for you
            </h2>
            {suggestedCreators.length === 0 ? (
              <p className="text-xs text-text-muted italic">No suggestions available.</p>
            ) : (
              suggestedCreators.map((creator) => {
                const isFollowing = followingMap[creator.userId];
                return (
                  <div key={creator.username} className="flex items-center justify-between gap-3">
                    <Link href={`/profile/${creator.username}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                      {creator.avatarUrl ? (
                        <img
                          src={getOptimizedMediaUrl(creator.avatarUrl, 80)}
                          alt={creator.displayName}
                          className="w-9 h-9 rounded-full object-cover ring-2 ring-white/5"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-primary-neon/20 flex items-center justify-center font-bold text-xs text-white">
                          {creator.displayName[0].toUpperCase()}
                        </div>
                      )}
                      <div className="text-left overflow-hidden w-24">
                        <p className="text-xs font-bold text-white truncate">{creator.displayName}</p>
                        <p className="text-[10px] text-text-muted truncate">@{creator.username}</p>
                      </div>
                    </Link>
                    <button
                      onClick={() => handleToggleFollow(creator.userId)}
                      className={`text-[10px] px-3 py-1.5 rounded-full font-bold transition-all flex items-center gap-1 flex-shrink-0 ${
                        isFollowing
                          ? "bg-white/6 border border-white/10 text-white hover:bg-white/10"
                          : "bg-primary text-white hover:bg-primary-hover shadow-glow-sm"
                      }`}
                    >
                      {isFollowing ? "Following" : <><UserPlus className="w-3 h-3" /> Follow</>}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Report Post Modal */}
      <AnimatePresence>
        {reportingPostId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-background-card border border-white/10 rounded-3xl p-6 relative shadow-2xl space-y-5"
            >
              {/* Close Button */}
              <button
                onClick={() => {
                  setReportingPostId(null);
                  setReportReason("");
                  setReportError(null);
                  setReportSuccess(false);
                }}
                className="absolute top-4 right-4 p-2 rounded-xl hover:bg-white/5 text-text-secondary hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Title */}
              <div>
                <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                  <Flag className="w-5 h-5 text-red-400" /> Report Content
                </h2>
                <p className="text-xs text-text-muted">Help us keep JabWeMet clean and safe.</p>
              </div>

              {/* Report Form */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!reportReason.trim() || isSubmittingReport) return;
                  setIsSubmittingReport(true);
                  setReportError(null);
                  setReportSuccess(false);

                  try {
                    const res = await fetch("/api/posts/report", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ postId: reportingPostId, reason: reportReason }),
                    });

                    if (res.ok) {
                      setReportSuccess(true);
                      setTimeout(() => {
                        setReportingPostId(null);
                        setReportReason("");
                        setReportSuccess(false);
                      }, 1200);
                    } else {
                      const data = await res.json().catch(() => ({}));
                      setReportError(data.error || "Failed to submit report.");
                    }
                  } catch (err) {
                    setReportError("Connection error. Please try again.");
                  } finally {
                    setIsSubmittingReport(false);
                  }
                }}
                className="space-y-4"
              >
                {reportError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
                    {reportError}
                  </div>
                )}

                {reportSuccess && (
                  <div className="p-3 bg-accent/10 border border-accent/20 text-accent text-xs rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> Report submitted successfully!
                  </div>
                )}

                <div className="space-y-2">
                  <label className="section-label">Why are you reporting this post?</label>
                  <textarea
                    required
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="Specify reasons e.g., Spam, Harassment, Inappropriate language..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-2xl bg-background-elevated/50 border border-white/10 text-white placeholder-text-faint text-xs input-glow transition-all resize-none"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReportingPostId(null);
                      setReportReason("");
                      setReportError(null);
                      setReportSuccess(false);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-text-secondary hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReport || reportSuccess}
                    className="px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs disabled:opacity-60 transition-all flex items-center gap-1.5"
                  >
                    {isSubmittingReport ? "Submitting..." : "Submit Report"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </NavigationShell>
  );
}
