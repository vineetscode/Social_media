"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import NavigationShell from "@/components/navigation-shell";
import StoriesCarousel from "@/components/stories-carousel";
import ImageUploader from "@/components/image-uploader";
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

  const fetchFeed = async () => {
    try {
      const response = await fetch("/api/feed");
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch (error) {
      console.error("Failed to load feed:", error);
    }
  };

  useEffect(() => {
    if (isLoaded && user) fetchFeed();
  }, [isLoaded, user]);

  const handlePublishPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isPublishing) return;
    setIsPublishing(true);
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
      }
    } catch (error) {
      console.error("Failed to publish post:", error);
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
              <AnimatePresence>
                {isComposerFocused && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden flex items-center justify-between pt-1"
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
                      <div className="flex items-center gap-3">
                        {post.author.profile?.avatarUrl ? (
                          <img
                            src={post.author.profile.avatarUrl}
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
                          <span className="text-text-muted text-[11px]">
                            @{post.author.profile?.username}
                          </span>
                        </div>
                      </div>
                      <span className="text-text-faint text-[11px]">
                        {new Date(post.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </span>
                    </div>

                    {/* Caption */}
                    <p className="text-text-primary text-sm whitespace-pre-wrap leading-relaxed">
                      {post.caption}
                    </p>

                    {/* Post media (if exists) */}
                    {post.media && post.media.length > 0 && (
                      <div className="rounded-2xl overflow-hidden border border-white/5 bg-black/20 aspect-video w-full mt-2">
                        <img
                          src={post.media[0].secureUrl || post.media[0].url}
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
                      <button className="flex items-center gap-1.5 hover:text-primary transition-colors group/btn">
                        <MessageCircle className="w-4.5 h-4.5 transition-transform duration-200 group-hover/btn:scale-110" />
                        <span className="text-xs">{post._count.comments}</span>
                      </button>
                      <button className="flex items-center gap-1.5 hover:text-accent-cyan transition-colors ml-auto group/btn">
                        <Share2 className="w-4.5 h-4.5 transition-transform duration-200 group-hover/btn:scale-110" />
                      </button>
                    </div>
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
            {[
              { name: "Alice Vance", handle: "alicev", color: "from-accent/30 to-accent/10" },
              { name: "Bob Marley", handle: "bobm", color: "from-primary/30 to-primary-neon/10" },
              { name: "Priya Dev", handle: "priyad", color: "from-accent-cyan/30 to-accent-cyan/10" },
            ].map(({ name, handle, color }) => (
              <div key={handle} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${color} flex items-center justify-center font-bold text-xs text-white`}>
                    {name[0]}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{name}</p>
                    <p className="text-[10px] text-text-muted">@{handle}</p>
                  </div>
                </div>
                <button className="text-[10px] px-3 py-1.5 rounded-full bg-white/8 border border-white/10 hover:bg-white/12 text-white font-bold transition-all flex items-center gap-1">
                  <UserPlus className="w-3 h-3" /> Follow
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </NavigationShell>
  );
}
