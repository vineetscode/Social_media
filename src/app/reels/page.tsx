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
  Share2,
  Flag,
  AlertCircle,
  CheckCircle2,
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

  // Comments Drawer States
  const [activeCommentReelId, setActiveCommentReelId] = useState<string | null>(null);
  const [reelComments, setReelComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentInput, setCommentInput] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Sharing & Reporting States
  const [copiedReelId, setCopiedReelId] = useState<string | null>(null);
  const [reportingReelId, setReportingReelId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSuccess, setReportSuccess] = useState(false);

  useEffect(() => {
    if (isLoaded && user) {
      fetch("/api/reels")
        .then((r) => {
          if (!r.ok) throw new Error("Failed to load reels");
          return r.json();
        })
        .then((d) => {
          if (Array.isArray(d)) {
            setReels(d);
            const initialLikes: Record<string, boolean> = {};
            d.forEach((reel: any) => {
              initialLikes[reel.id] = reel.likes && reel.likes.length > 0;
            });
            setLikedReels(initialLikes);
          }
          setIsLoading(false);
        })
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

  const handleOpenComments = async (reelId: string) => {
    setActiveCommentReelId(reelId);
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/comments?reelId=${reelId}`);
      if (res.ok) {
        const data = await res.json();
        setReelComments(data);
      }
    } catch (err) {
      console.error("Reel comments load error:", err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddReelComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCommentReelId || !commentInput.trim() || isSubmittingComment) return;
    setIsSubmittingComment(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reelId: activeCommentReelId, content: commentInput }),
      });
      if (res.ok) {
        const newComment = await res.json();
        setReelComments((prev) => [...prev, newComment]);
        setCommentInput("");
        setReels((prev) =>
          prev.map((r) => {
            if (r.id === activeCommentReelId) {
              return { ...r, _count: { ...r._count, comments: r._count.comments + 1 } };
            }
            return r;
          })
        );
      }
    } catch (err) {
      console.error("Reel comment error:", err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleShareReel = (reelId: string) => {
    const url = `${window.location.origin}/reel/${reelId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedReelId(reelId);
      setTimeout(() => setCopiedReelId(null), 2000);
    });
  };

  const handleReportReel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingReelId || !reportReason.trim() || isSubmittingReport) return;
    setIsSubmittingReport(true);
    setReportError(null);
    setReportSuccess(false);
    try {
      const res = await fetch("/api/posts/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reelId: reportingReelId, reason: reportReason }),
      });
      if (res.ok) {
        setReportSuccess(true);
        setReportReason("");
        setTimeout(() => setReportingReelId(null), 1500);
      } else {
        const err = await res.json().catch(() => ({}));
        setReportError(err.error || "Failed to submit report.");
      }
    } catch (err) {
      console.error(err);
      setReportError("Network error. Unable to submit report.");
    } finally {
      setIsSubmittingReport(false);
    }
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
                          <button onClick={() => handleOpenComments(reel.id)} className="p-3 rounded-full bg-black/40 border border-white/10 active:scale-90 transition-transform">
                            <MessageCircle className="w-5 h-5" />
                          </button>
                          <span className="text-[10px] font-bold">{reel._count.comments}</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <button onClick={() => handleShareReel(reel.id)} className={`p-3 rounded-full bg-black/40 border border-white/10 active:scale-90 transition-transform ${copiedReelId === reel.id ? "text-accent" : ""}`}>
                            <Share2 className="w-5 h-5" />
                          </button>
                          <span className="text-[10px] font-bold">{copiedReelId === reel.id ? "Copied!" : "Share"}</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <button onClick={() => setReportingReelId(reel.id)} className="p-3 rounded-full bg-black/40 border border-white/10 active:scale-90 transition-transform text-red-400 hover:text-red-300">
                            <Flag className="w-5 h-5" />
                          </button>
                          <span className="text-[10px] font-bold text-red-400/80">Report</span>
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

      {/* Reel Comments Drawer */}
      <AnimatePresence>
        {activeCommentReelId && (
          <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 backdrop-blur-xs">
            {/* Close trigger overlay */}
            <div className="absolute inset-0" onClick={() => setActiveCommentReelId(null)} />
            
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-full max-w-md h-[70vh] bg-[#13161d]/95 backdrop-blur-md rounded-t-3xl border-t border-white/10 p-5 flex flex-col z-10 relative shadow-float"
            >
              {/* Drag indicator */}
              <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-4" />

              <div className="flex justify-between items-center pb-3 border-b border-white/5">
                <h3 className="text-sm font-bold text-white">Comments</h3>
                <button onClick={() => setActiveCommentReelId(null)} className="p-1.5 rounded-xl hover:bg-white/5 text-text-muted hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable comments list */}
              <div className="flex-1 overflow-y-auto py-4 space-y-3.5 scrollbar-none">
                {loadingComments ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span className="text-xs text-text-muted">Loading comments...</span>
                  </div>
                ) : reelComments.length === 0 ? (
                  <p className="text-xs text-text-muted italic text-center py-10">No comments yet. Be the first to comment!</p>
                ) : (
                  reelComments.map((comment) => (
                    <div key={comment.id} className="flex items-start gap-3 text-xs text-text-secondary leading-relaxed font-sans">
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 bg-white/5 flex-shrink-0 flex items-center justify-center">
                        {comment.author?.profile?.avatarUrl ? (
                          <img src={comment.author.profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs font-bold">{comment.author?.profile?.displayName?.substring(0, 1).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="flex-1 bg-white/3 rounded-2xl px-3.5 py-2.5 border border-white/5">
                        <p className="font-bold text-white text-[11px] mb-0.5">
                          @{comment.author?.profile?.username || "user"}
                        </p>
                        <p className="break-words">{comment.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Input section */}
              <form onSubmit={handleAddReelComment} className="pt-3 border-t border-white/5 flex items-center gap-2">
                <input
                  type="text"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 px-4 py-3 rounded-2xl bg-white/3 border border-white/10 text-white placeholder-text-faint text-xs focus:outline-none focus:border-primary/50 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!commentInput.trim() || isSubmittingComment}
                  className="p-3 rounded-2xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-white transition-all shadow-glow-sm"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reel Report Modal */}
      <AnimatePresence>
        {reportingReelId && (
          <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              className="w-full max-w-md glass-card rounded-3xl p-6 relative shadow-float space-y-5"
            >
              <button 
                onClick={() => setReportingReelId(null)} 
                className="absolute top-4 right-4 p-2 rounded-xl hover:bg-white/5 text-text-muted hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Flag className="w-5 h-5 text-red-400" /> Report Reel
                </h3>
                <p className="text-xs text-text-muted mt-0.5">Let us know what's wrong. We review reports confidentially.</p>
              </div>

              {reportSuccess ? (
                <div className="flex flex-col items-center py-6 gap-2 text-accent">
                  <CheckCircle2 className="w-12 h-12" />
                  <p className="text-sm font-bold">Report Submitted Successfully</p>
                  <p className="text-xs text-text-muted text-center font-sans">Thank you for helping keep JabWeMet safe.</p>
                </div>
              ) : (
                <form onSubmit={handleReportReel} className="space-y-4">
                  <div className="space-y-1">
                    <label className="section-label">Reason for reporting</label>
                    <textarea 
                      value={reportReason} 
                      onChange={(e) => setReportReason(e.target.value)} 
                      placeholder="Why are you reporting this reel? (e.g. spam, harassment, explicit content)" 
                      className="w-full min-h-[100px] p-4 rounded-2xl bg-background-elevated/50 border border-white/10 text-white placeholder-text-faint resize-none text-sm input-glow" 
                      required
                    />
                  </div>
                  
                  {reportError && (
                    <div className="flex items-center gap-2 text-xs text-accent-rose bg-accent-rose/10 p-3 rounded-xl">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{reportError}</span>
                    </div>
                  )}

                  <div className="flex gap-3 justify-end pt-1">
                    <button type="button" onClick={() => setReportingReelId(null)} className="px-4 py-2 text-xs font-semibold text-text-muted hover:text-white transition-colors">Cancel</button>
                    <button type="submit" disabled={isSubmittingReport || !reportReason.trim()} className="px-5 py-2.5 rounded-2xl bg-accent hover:bg-accent/90 text-black font-bold text-xs disabled:opacity-60 transition-all flex items-center gap-1.5 shadow-glow-sm">
                      {isSubmittingReport ? "Submitting..." : "Submit Report"}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </NavigationShell>
  );
}
