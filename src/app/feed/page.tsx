"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
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
  UserMinus,
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
  caption: string;
  createdAt: string;
  author: Author;
  media?: Media[];
  _count: { likes: number; comments: number };
}

export default function FeedPage() {
  const { user, isLoaded } = useUser();
  const [posts, setPosts] = useState<Post[]>([]);
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

  const fetchFeed = async () => {
    setFeedError(null);
    try {
      const response = await fetch("/api/feed");
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
        const initialLikes: Record<string, boolean> = {};
        data.forEach((p: any) => {
          initialLikes[p.id] = p.likes && p.likes.length > 0;
        });
        setLikedPosts(initialLikes);
      } else {
        const errData = await response.json().catch(() => ({}));
        setFeedError(errData.error || "Failed to load feed from database.");
      }
    } catch (error) {
      console.error("Failed to load feed:", error);
      setFeedError("Network connection error. Unable to load feed.");
    }
  };

  const fetchSuggestions = async () => {
    try {
      const res = await fetch("/api/explore");
      if (res.ok) {
        const data = await res.json();
        if (data.creators) {
          // Filter out current user's profile if possible
          const filtered = data.creators.filter((c: any) => c.userId !== user?.id);
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

  useEffect(() => {
    if (isLoaded && user) {
      fetchFeed();
      fetchSuggestions();
      fetchFollowings();
    }
  }, [isLoaded, user]);

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

  const handlePublishPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isPublishing) return;
    setIsPublishing(true);
    setPublishError(null);
    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption: inputText, imageUrl: uploadedImageUrl || undefined }),
      });
      if (response.ok) {
        const newPost = await response.json();
        const postWithAuthor: Post = {
          ...newPost,
          author: {
            profile: {
              username: user?.username || "me",
              displayName: user?.fullName || "My Profile",
              avatarUrl: user?.imageUrl || "",
              isVerified: false,
            },
          },
          _count: { likes: 0, comments: 0 },
        };
        setPosts((prev) => [postWithAuthor, ...prev]);
        setInputText("");
        setUploadedImageUrl("");
        setShowImageUploader(false);
        setShowEmojiPicker(false);
        setIsComposerFocused(false);
      } else {
        const errData = await response.json().catch(() => ({}));
        setPublishError(errData.error || "Failed to publish post. Please check database connection.");
      }
    } catch (error) {
      console.error("Failed to publish post:", error);
      setPublishError("Network error. Unable to publish post.");
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

  if (!isLoaded || !user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        </div>
        <span className="text-xs font-semibold tracking-widest uppercase text-text-muted">
          Loading your feed...
        </span>
      </div>
    );
  }

  return (
    <NavigationShell>
      <div className="flex flex-col lg:flex-row max-w-5xl mx-auto w-full py-6 px-4 md:px-6 md:py-8 gap-8">
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
              <Sparkles className="w-3.5 h-3.5 text-primary" />
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
                        onClick={() => { setIsComposerFocused(false); setInputText(""); }}
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
                <p className="font-black text-white">Database Offline or Paused</p>
                <p className="text-text-muted mt-0.5 font-normal">Failed to query feed. Please check that your Supabase instance is active and not paused.</p>
              </div>
              <button 
                onClick={fetchFeed} 
                className="px-4 py-2 rounded-xl bg-accent-rose/20 hover:bg-accent-rose/30 text-white text-xs font-bold transition-all"
              >
                Retry
              </button>
            </div>
          )}

          {/* Posts */}
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
                    className="p-5 rounded-3xl glass-card space-y-4 relative overflow-hidden group select-none"
                    onDoubleClick={() => handleDoubleTap(post.id)}
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
                        <span className="text-text-faint text-[11px]">
                          {new Date(post.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </span>
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

            {posts.length === 0 && (
              <div className="text-center py-20 glass-card rounded-3xl flex flex-col items-center gap-4">
                <AlertCircle className="w-10 h-10 text-text-faint" />
                <div>
                  <p className="text-text-secondary text-sm font-semibold">Your feed is empty</p>
                  <p className="text-text-muted text-xs mt-1">Write your first post above or follow some creators!</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar — Desktop only */}
        <div className="hidden lg:block w-72 space-y-5 flex-shrink-0">
          <div className="glass-card rounded-3xl p-5 space-y-4 sticky top-8">
            <h3 className="section-label flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-accent" /> Creators for you
            </h3>
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
                <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                  <Flag className="w-5 h-5 text-red-400" /> Report Content
                </h3>
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
