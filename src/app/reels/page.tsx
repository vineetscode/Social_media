"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import NavigationShell from "@/components/navigation-shell";
import VideoUploader from "@/components/video-uploader";
import {
  Heart,
  MessageCircle,
  Play,
  Volume2,
  VolumeX,
  PlusCircle,
  Loader2,
  Tv,
  Send,
  X,
} from "lucide-react";

interface Profile { username: string; displayName: string; avatarUrl?: string; isVerified?: boolean; }
interface Author { profile: Profile | null; }
interface Reel {
  id: string; caption: string; viewsCount: number; createdAt: string;
  author: Author; media: { url: string }[];
  _count: { likes: number; comments: number };
}

export default function ReelsPage() {
  const { user, isLoaded } = useUser();
  const [reels, setReels] = useState<Reel[]>([]);
  const [likedReels, setLikedReels] = useState<Record<string, boolean>>({});
  const [isMuted, setIsMuted] = useState(true);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [newCaption, setNewCaption] = useState("");
  const [uploadedVideo, setUploadedVideo] = useState<{ url: string; streamingUrl: string; thumbnailUrl: string; publicId: string } | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeHearts, setActiveHearts] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isLoaded && user) {
      fetch("/api/reels")
        .then((r) => r.json())
        .then((d) => { if (Array.isArray(d)) setReels(d); setIsLoading(false); })
        .catch(() => setIsLoading(false));
    }
  }, [isLoaded, user]);

  const handleToggleLike = async (reelId: string, forceLikeOnly = false) => {
    const isLiked = likedReels[reelId];
    if (forceLikeOnly && isLiked) return;
    setLikedReels((prev) => ({ ...prev, [reelId]: forceLikeOnly ? true : !isLiked }));
    setReels((prev) =>
      prev.map((r) => {
        if (r.id === reelId) {
          const inc = forceLikeOnly ? (isLiked ? 0 : 1) : isLiked ? -1 : 1;
          return { ...r, _count: { ...r._count, likes: r._count.likes + inc } };
        }
        return r;
      })
    );
    try {
      await fetch("/api/likes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId: reelId }) });
    } catch (_) {}
  };

  const handleDoubleTap = (reelId: string) => {
    setActiveHearts((prev) => ({ ...prev, [reelId]: true }));
    handleToggleLike(reelId, true);
    setTimeout(() => setActiveHearts((prev) => ({ ...prev, [reelId]: false })), 850);
  };

  const handlePublishReel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedVideo || isPublishing) return;
    setIsPublishing(true);
    try {
      const response = await fetch("/api/reels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption: newCaption, mediaUrl: uploadedVideo.url }),
      });
      if (response.ok) {
        const newReel = await response.json();
        const reelWithAuthor: Reel = {
          ...newReel,
          author: { profile: { username: user?.username || "me", displayName: user?.fullName || "My Profile", avatarUrl: user?.imageUrl || "" } },
          _count: { likes: 0, comments: 0 },
        };
        setReels((prev) => [reelWithAuthor, ...prev]);
        setNewCaption(""); setUploadedVideo(null); setShowPublishModal(false);
      }
    } catch (_) {}
    finally { setIsPublishing(false); }
  };

  if (!isLoaded || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center gap-4">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
        <span className="text-xs uppercase tracking-widest text-text-muted">Loading Reels...</span>
      </div>
    );
  }

  return (
    <NavigationShell fullBleed>
      {/* fullBleed mode: no bottom dock padding, full-height scroll */}
      <div className="flex flex-col h-screen">
        {/* Post Reel button — floating top right */}
        <button
          onClick={() => setShowPublishModal(true)}
          className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-accent text-black font-bold text-xs hover:bg-accent/85 transition-all shadow-float"
        >
          <PlusCircle className="w-4 h-4" />
          <span className="hidden sm:inline">Post Reel</span>
        </button>

        {/* Vertical Snap Container */}
        <div className="flex-1 flex justify-center bg-black/95 overflow-y-scroll snap-y snap-mandatory scrollbar-none pt-[57px] md:pt-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 text-text-muted">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="section-label">Loading Reels...</span>
            </div>
          ) : reels.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 text-text-muted p-8">
              <Tv className="w-14 h-14 text-text-faint" />
              <div className="text-center">
                <p className="text-sm font-semibold">No Reels yet</p>
                <p className="text-xs text-text-muted mt-1">Be the first to share one!</p>
              </div>
              <button onClick={() => setShowPublishModal(true)} className="px-5 py-2.5 rounded-2xl bg-accent text-black font-bold text-xs hover:bg-accent/85">
                Post a Reel
              </button>
            </div>
          ) : (
            <div className="w-full max-w-[420px] h-full overflow-y-scroll snap-y snap-mandatory scrollbar-none flex flex-col">
              {reels.map((reel) => {
                const isLiked = likedReels[reel.id];
                const hasPoppedHeart = activeHearts[reel.id];
                return (
                  <div
                    key={reel.id}
                    className="w-full min-h-screen snap-start relative flex flex-col justify-end bg-background-elevated/20"
                    onDoubleClick={() => handleDoubleTap(reel.id)}
                  >
                    <video
                      src={reel.media[0]?.url || "https://assets.mixkit.co/videos/preview/mixkit-dancing-woman-in-the-city-1209-large.mp4"}
                      className="absolute inset-0 w-full h-full object-cover z-0"
                      loop muted={isMuted} autoPlay playsInline
                    />
                    <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10 pointer-events-none" />

                    {/* Mute toggle */}
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-black/50 border border-white/10 text-white transition-colors hover:bg-black/70"
                    >
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>

                    {/* Heart pop */}
                    <AnimatePresence>
                      {hasPoppedHeart && (
                        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                          <div className="text-red-500 text-7xl animate-heart-pop">💖</div>
                        </div>
                      )}
                    </AnimatePresence>

                    {/* Bottom info bar */}
                    <div className="p-5 z-20 flex justify-between items-end gap-6 w-full relative">
                      <div className="space-y-3 max-w-[80%]">
                        <div className="flex items-center gap-2">
                          {reel.author.profile?.avatarUrl ? (
                            <img src={reel.author.profile.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-white/20" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-primary/25 flex items-center justify-center text-primary font-bold text-xs ring-2 ring-primary/30">
                              {reel.author.profile?.displayName.substring(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <h4 className="text-xs font-bold text-white">{reel.author.profile?.displayName}</h4>
                            <span className="text-[10px] text-white/60">@{reel.author.profile?.username}</span>
                          </div>
                        </div>
                        <p className="text-white text-xs leading-relaxed line-clamp-2 drop-shadow">{reel.caption}</p>
                      </div>

                      {/* Action column */}
                      <div className="flex flex-col items-center gap-5 text-white">
                        <div className="flex flex-col items-center gap-1">
                          <button onClick={() => handleToggleLike(reel.id)} className={`p-3 rounded-full bg-black/40 border border-white/10 active:scale-90 transition-transform ${isLiked ? "text-accent-rose" : ""}`}>
                            <Heart className={`w-5 h-5 ${isLiked ? "fill-accent-rose stroke-accent-rose" : ""}`} />
                          </button>
                          <span className="text-[10px] font-bold">{reel._count.likes}</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <button className="p-3 rounded-full bg-black/40 border border-white/10 active:scale-90 transition-transform">
                            <MessageCircle className="w-5 h-5" />
                          </button>
                          <span className="text-[10px] font-bold">{reel._count.comments}</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <div className="p-3 rounded-full bg-black/40 border border-white/10 text-white/60">
                            <Play className="w-4 h-4 fill-current" />
                          </div>
                          <span className="text-[10px] font-bold">{reel.viewsCount}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Publish Modal */}
      <AnimatePresence>
        {showPublishModal && (
          <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              className="w-full max-w-md glass-card rounded-3xl p-6 relative shadow-float space-y-5"
            >
              <button onClick={() => setShowPublishModal(false)} className="absolute top-4 right-4 p-2 rounded-xl hover:bg-white/5 text-text-muted hover:text-white transition-all">
                <X className="w-5 h-5" />
              </button>
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2"><Tv className="w-5 h-5 text-accent" /> Post a Reel</h3>
                <p className="text-xs text-text-muted mt-0.5">Share a looping short video with your followers.</p>
              </div>
              <form onSubmit={handlePublishReel} className="space-y-4">
                <div className="space-y-1">
                  <label className="section-label">Upload Video</label>
                  <VideoUploader
                    onUploadComplete={(data) => setUploadedVideo(data)}
                    onUploadError={(err) => console.error("Reel upload error:", err)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="section-label">Caption</label>
                  <textarea value={newCaption} onChange={(e) => setNewCaption(e.target.value)} placeholder="Describe your reel... #loop #genz" className="w-full min-h-[80px] p-4 rounded-2xl bg-background-elevated/50 border border-white/10 text-white placeholder-text-faint resize-none text-sm input-glow" />
                </div>
                <div className="flex gap-3 justify-end pt-1">
                  <button type="button" onClick={() => setShowPublishModal(false)} className="px-4 py-2 text-xs font-semibold text-text-muted hover:text-white transition-colors">Cancel</button>
                  <button type="submit" disabled={isPublishing || !uploadedVideo} className="px-5 py-2.5 rounded-2xl bg-primary hover:bg-primary-hover text-white font-bold text-xs disabled:opacity-60 transition-all flex items-center gap-1.5 shadow-glow-sm">
                    {isPublishing ? "Publishing..." : <><span>Post Reel</span><Send className="w-3.5 h-3.5" /></>}
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
