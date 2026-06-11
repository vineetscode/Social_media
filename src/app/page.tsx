"use client";

import { useState } from "react";
import Link from "next/link";
import { SignedIn, SignedOut, UserButton, SignIn, SignUp } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, MessageSquare, Shield, ArrowRight, Sparkles, X } from "lucide-react";

export default function Home() {
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up" | null>(null);

  // Animation Variants for sequential entrance
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
      },
    },
  };

  const glowVariants = {
    animate: {
      scale: [1, 1.05, 1],
      opacity: [0.5, 0.8, 0.5],
      transition: {
        duration: 8,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };

  return (
    <main className="flex flex-col items-center justify-between min-h-screen p-4 sm:p-8 md:p-16 bg-background relative overflow-hidden">
      {/* Animated Abstract Neon Gradients */}
      <motion.div
        variants={glowVariants}
        animate="animate"
        className="absolute top-[-10%] left-[-10%] w-[60%] h-[50%] rounded-full bg-primary/20 blur-[130px] pointer-events-none"
      />
      <motion.div
        variants={glowVariants}
        animate="animate"
        className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[50%] rounded-full bg-accent/10 blur-[130px] pointer-events-none"
      />

      {/* Header */}
      <motion.header
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 120, delay: 0.1 }}
        className="w-full max-w-5xl flex justify-between items-center z-10 py-4 px-6 border border-white/5 glass-panel rounded-2xl shadow-glass"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center shadow-glow-sm">
            <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <span className="text-xl sm:text-2xl font-black bg-gradient-to-r from-primary to-primary-neon bg-clip-text text-transparent tracking-tight">
            JabWeMet
          </span>
          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/20 font-bold uppercase tracking-widest hidden sm:inline-block">
            MVP
          </span>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <SignedIn>
            <div className="flex items-center gap-4">
              <Link
                href="/feed"
                className="text-xs sm:text-sm font-semibold text-text-secondary hover:text-white transition-colors"
              >
                Go to Feed
              </Link>
              <UserButton afterSignOutUrl="/" />
            </div>
          </SignedIn>
          <SignedOut>
            <button
              onClick={() => setAuthMode("sign-in")}
              className="text-xs sm:text-sm font-medium hover:text-white transition-colors px-2 py-1 text-text-secondary"
            >
              Login
            </button>
            <button
              onClick={() => setAuthMode("sign-up")}
              className="px-4 py-2 text-xs sm:text-sm font-bold rounded-xl bg-primary hover:bg-primary-hover text-white shadow-lg transition-all duration-300 transform hover:scale-[1.03]"
            >
              Get Started
            </button>
          </SignedOut>
        </div>
      </motion.header>

      {/* Hero Showcase Block */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col items-center justify-center flex-grow max-w-3xl text-center z-10 my-16 px-4"
      >
        <motion.div
          variants={itemVariants}
          className="mb-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-primary-neon font-semibold uppercase tracking-wider"
        >
          <Sparkles className="w-3.5 h-3.5" /> Next-gen social ecosystem
        </motion.div>

        <motion.h1
          variants={itemVariants}
          className="text-4xl sm:text-6xl md:text-8xl font-black tracking-tight text-white mb-6 leading-[1.05]"
        >
          Social Web <br />
          <span className="bg-gradient-to-r from-primary via-primary-neon to-accent bg-clip-text text-transparent">
            Reimagined.
          </span>
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="text-text-secondary text-base sm:text-lg md:text-xl max-w-xl mb-10 leading-relaxed"
        >
          JabWeMet is a next-generation social ecosystem designed for Gen-Z and digital creators. Share your stories, post interactive reels, connect in real-time chat, and engage with a vibrant community.
        </motion.p>

        <motion.div variants={itemVariants} className="w-full">
          <SignedIn>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-md mx-auto">
              <Link
                href="/feed"
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold shadow-lg transition-all transform hover:scale-[1.03] flex items-center justify-center gap-2"
              >
                Explore Feed <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/chat"
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-background-card border border-white/10 text-white font-bold hover:bg-white/5 transition-all transform hover:scale-[1.03]"
              >
                Direct Messages
              </Link>
            </div>
          </SignedIn>

          <SignedOut>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-md mx-auto">
              <button
                onClick={() => setAuthMode("sign-up")}
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold shadow-lg transition-all transform hover:scale-[1.03] flex items-center justify-center gap-2"
              >
                Join the Network <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setAuthMode("sign-in")}
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-background-card border border-white/10 text-white font-bold hover:bg-white/5 transition-all transform hover:scale-[1.03]"
              >
                Login Account
              </button>
            </div>
          </SignedOut>
        </motion.div>
      </motion.div>

      {/* Feature Grid with Entrance Animation */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl z-10 mt-4 px-2"
      >
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -8, borderColor: "rgba(99, 102, 241, 0.4)" }}
          onClick={() => setAuthMode("sign-in")}
          className="p-6 rounded-2xl bg-background-card border border-white/5 shadow-glass glass-panel transition-all group duration-300 flex flex-col items-start cursor-pointer"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform duration-300">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2 group-hover:text-primary transition-colors">Instant Media</h3>
          <p className="text-text-secondary text-sm leading-relaxed">
            Record reels, upload multi-image carousels, and log daily stories directly from mobile devices.
          </p>
        </motion.div>

        <motion.div
          variants={itemVariants}
          whileHover={{ y: -8, borderColor: "rgba(16, 185, 129, 0.4)" }}
          onClick={() => setAuthMode("sign-in")}
          className="p-6 rounded-2xl bg-background-card border border-white/5 shadow-glass glass-panel transition-all group duration-300 flex flex-col items-start cursor-pointer"
        >
          <div className="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center text-accent mb-4 group-hover:scale-110 transition-transform duration-300">
            <MessageSquare className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2 group-hover:text-accent transition-colors">Real-Time Streams</h3>
          <p className="text-text-secondary text-sm leading-relaxed">
            Instant websocket text messages, typing indicator updates, and immediate read status receipts.
          </p>
        </motion.div>

        <motion.div
          variants={itemVariants}
          whileHover={{ y: -8, borderColor: "rgba(139, 92, 246, 0.4)" }}
          onClick={() => setAuthMode("sign-in")}
          className="p-6 rounded-2xl bg-background-card border border-white/5 shadow-glass glass-panel transition-all group duration-300 flex flex-col items-start cursor-pointer"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center text-primary-neon mb-4 group-hover:scale-110 transition-transform duration-300">
            <Shield className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2 group-hover:text-primary-neon transition-colors">Safe Networks</h3>
          <p className="text-text-secondary text-sm leading-relaxed">
            JWT session cookies, double-submit CSRF, and strict Follow/Block privacy graph configurations.
          </p>
        </motion.div>
      </motion.div>

      {/* Auth Modal Overlay */}
      <AnimatePresence>
        {authMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 200, damping: 22 }}
              className="relative rounded-3xl bg-background-card border border-white/10 p-6 shadow-2xl max-w-md w-full flex flex-col items-center"
            >
              <button
                onClick={() => setAuthMode(null)}
                className="absolute top-4 right-4 p-2 rounded-xl hover:bg-white/5 text-text-secondary hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-full mt-4 flex justify-center">
                {authMode === "sign-in" ? (
                  <SignIn routing="hash" />
                ) : (
                  <SignUp routing="hash" />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer copyright */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="w-full max-w-5xl text-center text-text-muted text-xs mt-12 py-6 border-t border-white/5 z-10"
      >
        &copy; {new Date().getFullYear()} JabWeMet. Responsive and animated for Gen-Z.
      </motion.footer>
    </main>
  );
}
