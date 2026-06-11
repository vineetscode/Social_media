"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, ChevronLeft, ChevronRight, Loader2, Image as ImageIcon, AlertCircle } from "lucide-react";
import ImageUploader from "@/components/image-uploader";
import { getOptimizedMediaUrl } from "@/lib/media-optimize";

interface Profile {
  username: string;
  displayName: string;
  avatarUrl?: string;
}

interface Story {
  id: string;
  authorId: string;
  createdAt: string;
  author: {
    profile: Profile | null;
  };
  media: {
    url: string;
  }[];
}

interface UserGroupedStories {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  stories: Story[];
}

export default function StoriesCarousel() {
  const { user, isLoaded } = useUser();
  const [groupedStories, setGroupedStories] = useState<UserGroupedStories[]>([]);
  const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [uploadedStoryUrl, setUploadedStoryUrl] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [storyProgress, setStoryProgress] = useState(0);
  const [storyError, setStoryError] = useState<string | null>(null);

  const fetchStories = () => {
    fetch("/api/stories")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load stories: " + res.status);
        return res.json();
      })
      .then((data: Story[]) => {
        if (!Array.isArray(data)) return;

        // Group stories by creator
        const groups: Record<string, UserGroupedStories> = {};
        
        data.forEach((story) => {
          const authorId = story.authorId;
          if (!groups[authorId]) {
            groups[authorId] = {
              userId: authorId,
              username: story.author.profile?.username || "user",
              displayName: story.author.profile?.displayName || "Creator",
              avatarUrl: story.author.profile?.avatarUrl || "",
              stories: [],
            };
          }
          groups[authorId].stories.push(story);
        });

        setGroupedStories(Object.values(groups));
      })
      .catch((err) => console.error("Error loading stories:", err));
  };

  useEffect(() => {
    if (isLoaded && user) {
      fetchStories();
    }
  }, [isLoaded, user]);

  // Handle auto-progress progress bar for open stories
  useEffect(() => {
    if (activeGroupIndex === null) {
      setStoryProgress(0);
      return;
    }

    setStoryProgress(0);
    const intervalTime = 50; // Update progress bar every 50ms
    const totalDuration = 4500; // 4.5 seconds per story
    const step = (intervalTime / totalDuration) * 100;

    const timer = setInterval(() => {
      setStoryProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          handleNextStory();
          return 0;
        }
        return prev + step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [activeGroupIndex, activeStoryIndex]);

  // Log a story view
  useEffect(() => {
    if (activeGroupIndex === null) return;
    const activeGroup = groupedStories[activeGroupIndex];
    const activeStory = activeGroup?.stories[activeStoryIndex];
    if (!activeStory) return;

    fetch("/api/stories/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storyId: activeStory.id }),
    }).catch((err) => console.error(err));
  }, [activeGroupIndex, activeStoryIndex]);

  const handleOpenGroup = (index: number) => {
    setActiveGroupIndex(index);
    setActiveStoryIndex(0);
  };

  const handleCloseViewer = () => {
    setActiveGroupIndex(null);
    setStoryProgress(0);
  };

  const handleNextStory = () => {
    if (activeGroupIndex === null) return;
    const currentGroup = groupedStories[activeGroupIndex];

    if (activeStoryIndex < currentGroup.stories.length - 1) {
      setActiveStoryIndex((prev) => prev + 1);
    } else {
      // Go to next user's stories
      if (activeGroupIndex < groupedStories.length - 1) {
        setActiveGroupIndex((prev) => prev! + 1);
        setActiveStoryIndex(0);
      } else {
        // Close viewer if no more stories
        handleCloseViewer();
      }
    }
  };

  const handlePrevStory = () => {
    if (activeGroupIndex === null) return;

    if (activeStoryIndex > 0) {
      setActiveStoryIndex((prev) => prev - 1);
    } else {
      // Go to previous user's stories
      if (activeGroupIndex > 0) {
        setActiveGroupIndex((prev) => prev! - 1);
        const prevGroup = groupedStories[activeGroupIndex - 1];
        setActiveStoryIndex(prevGroup.stories.length - 1);
      } else {
        // Go back to start of current story if first
        setStoryProgress(0);
      }
    }
  };

  const handleAddStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadedStoryUrl.trim() || isPublishing) return;

    setIsPublishing(true);
    setStoryError(null);
    try {
      const response = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaUrl: uploadedStoryUrl }),
      });

      if (response.ok) {
        fetchStories();
        setUploadedStoryUrl("");
        setShowAddModal(false);
      } else {
        const errData = await response.json().catch(() => ({}));
        setStoryError(errData.error || "Failed to publish story.");
      }
    } catch (err) {
      console.error("Failed to publish story:", err);
      setStoryError("Network error. Unable to publish story.");
    } finally {
      setIsPublishing(false);
    }
  };

  const activeGroup = activeGroupIndex !== null ? groupedStories[activeGroupIndex] : null;
  const activeStory = activeGroup ? activeGroup.stories[activeStoryIndex] : null;

  return (
    <div className="w-full relative">
      {/* 1. STORIES TRAY SLIDER */}
      <div className="flex gap-4 items-center overflow-x-auto py-2 scrollbar-none select-none">
        
        {/* Create Story Button */}
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer relative" onClick={() => setShowAddModal(true)}>
          <div className="w-14 h-14 rounded-full p-[2.5px] border border-white/10 relative hover:scale-105 transition-transform duration-300">
            {user?.imageUrl ? (
              <img
                src={getOptimizedMediaUrl(user.imageUrl, 120)}
                alt="Your avatar"
                className="w-full h-full rounded-full object-cover border border-background"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-background-elevated flex items-center justify-center text-primary font-bold text-sm border border-background">
                Y
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-4.5 h-4.5 bg-primary rounded-full flex items-center justify-center border border-background shadow-md">
              <Plus className="w-3 h-3 text-white" />
            </div>
          </div>
          <span className="text-[10px] text-text-muted font-bold">Your Story</span>
        </div>

        {/* List Active Creators Stories */}
        {groupedStories.map((group, idx) => (
          <div
            key={group.userId}
            className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
            onClick={() => handleOpenGroup(idx)}
          >
            <div className="w-14 h-14 rounded-full p-[2.5px] bg-gradient-to-tr from-primary via-primary-neon to-accent hover:scale-105 transition-transform duration-300">
              {group.avatarUrl ? (
                <img
                  src={getOptimizedMediaUrl(group.avatarUrl, 120)}
                  alt={group.displayName}
                  className="w-full h-full rounded-full object-cover border border-background"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-background-elevated flex items-center justify-center text-primary font-bold text-sm border border-background">
                  {group.displayName.substring(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <span className="text-[10px] text-text-secondary truncate w-14 text-center font-medium">
              {group.username}
            </span>
          </div>
        ))}
      </div>

      {/* 2. FULL-SCREEN STORIES IMMERSIVE VIEWER */}
      <AnimatePresence>
        {activeGroup && activeStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4"
          >
            <div className="relative w-full max-w-[420px] h-full max-h-[780px] bg-background-card rounded-3xl overflow-hidden flex flex-col justify-between shadow-2xl border border-white/5">
              
              {/* TOP SLIDES PROGRESS BARS */}
              <div className="absolute top-3 inset-x-3 flex gap-1 z-20">
                {activeGroup.stories.map((s, idx) => (
                  <div key={s.id} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white transition-all ease-linear"
                      style={{
                        width:
                          idx < activeStoryIndex
                            ? "100%"
                            : idx === activeStoryIndex
                            ? `${storyProgress}%`
                            : "0%",
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* STORY CREATOR PROFILE OVERLAY */}
              <div className="absolute top-7 inset-x-4 flex justify-between items-center z-20 text-white">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-xs">
                    {activeGroup.displayName.substring(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold">{activeGroup.displayName}</h4>
                    <span className="text-[9px] text-white/60">
                      {new Date(activeStory.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleCloseViewer}
                  className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* NAVIGATION BUTTONS (DESKTOP CONTROLS) */}
              <button
                onClick={handlePrevStory}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white hidden sm:flex border border-white/5"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNextStory}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white hidden sm:flex border border-white/5"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* TAP REGIONS FOR MOBILE GESTURES */}
              <div className="absolute inset-y-0 left-0 w-[30%] z-10 cursor-pointer sm:hidden" onClick={handlePrevStory} />
              <div className="absolute inset-y-0 right-0 w-[30%] z-10 cursor-pointer sm:hidden" onClick={handleNextStory} />

              {/* STORY IMAGE BODY */}
              <div className="flex-1 w-full h-full relative z-0 flex items-center justify-center bg-black/10">
                <img
                  src={getOptimizedMediaUrl(activeStory.media[0]?.url, 1080)}
                  alt="Story Content"
                  className="w-full h-full object-contain pointer-events-none"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. PUBLISH STORY MODAL OVERLAY */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-background-card border border-white/10 rounded-3xl p-6 relative shadow-2xl space-y-4"
            >
              <button
                onClick={() => setShowAddModal(false)}
                className="absolute top-4 right-4 p-2 rounded-xl hover:bg-white/5 text-text-secondary hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-1">
                <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-accent" /> Publish a Story
                </h3>
                <p className="text-xs text-text-muted">Upload an ephemeral photo visible to your followers for 24 hours.</p>
              </div>

              <form onSubmit={handleAddStory} className="space-y-4">
                {/* Error display */}
                {storyError && (
                  <div className="p-3 rounded-2xl bg-accent-rose/10 border border-accent-rose/25 text-accent-rose text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{storyError}</span>
                  </div>
                )}
                <div className="space-y-1">
                  <label className="section-label">Upload Story Image</label>
                  <ImageUploader
                    type="story"
                    previewShape="square"
                    placeholder="Upload story image"
                    onUploadComplete={(url) => setUploadedStoryUrl(url)}
                    onUploadError={(err) => console.error("Story upload error:", err)}
                    className="w-full max-w-xs mx-auto"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-text-secondary hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPublishing || !uploadedStoryUrl}
                    className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs disabled:opacity-60 transition-all flex items-center gap-1.5"
                  >
                    {isPublishing ? "Publishing..." : <>Post Story <Plus className="w-3.5 h-3.5" /></>}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
