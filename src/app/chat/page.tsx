"use client";

import { useEffect, useState, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { getSocket } from "@/lib/socket";
import { motion, AnimatePresence } from "framer-motion";
import NavigationShell from "@/components/navigation-shell";
import {
  Send,
  Search,
  MessageSquare,
  Phone,
  Video,
  Info,
  Loader2,
  ChevronLeft,
} from "lucide-react";

interface Profile {
  userId: string; username: string; displayName: string;
  avatarUrl?: string; isVerified?: boolean;
}
interface Message {
  id: string; senderId: string; recipientId: string;
  content: string; createdAt: string;
}

export default function ChatPage() {
  const { user, isLoaded } = useUser();
  const [users, setUsers] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeRecipient, setActiveRecipient] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const socketRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoaded || !user) return;
    fetch("/api/users")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load users");
        return r.json();
      })
      .then((data) => { if (Array.isArray(data)) setUsers(data); })
      .catch((err) => console.error(err));
  }, [isLoaded, user]);

  useEffect(() => {
    if (!isLoaded || !user) return;
    const socket = getSocket(user.id);
    socketRef.current = socket;
    socket.connect();
    socket.emit("join_room", { userId: user.id });
    socket.on("new_message", (message: Message) => {
      if (
        (message.senderId === user.id && message.recipientId === activeRecipient?.userId) ||
        (message.senderId === activeRecipient?.userId && message.recipientId === user.id)
      ) {
        setMessages((prev) => [...prev, message]);
      }
    });
    return () => { socket.disconnect(); };
  }, [isLoaded, user, activeRecipient]);

  useEffect(() => {
    if (!user || !activeRecipient) return;
    fetch(`/api/chat?recipientId=${activeRecipient.userId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load messages");
        return r.json();
      })
      .then((data) => { setMessages(Array.isArray(data) ? data.reverse() : []); })
      .catch((err) => console.error(err));
    setIsTyping(true);
    const timer = setTimeout(() => setIsTyping(false), 1800);
    return () => clearTimeout(timer);
  }, [activeRecipient, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeRecipient || !inputText.trim()) return;
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: activeRecipient.userId, content: inputText }),
      });
      if (response.ok) {
        const savedMessage = await response.json();
        setMessages((prev) => [...prev, savedMessage]);
        socketRef.current?.emit("send_message", savedMessage);
        setInputText("");
      }
    } catch (error) { console.error("Failed to send:", error); }
  };

  const handleSelectUser = (profile: Profile) => {
    setActiveRecipient(profile);
    setMobileThreadOpen(true);
  };

  const filteredUsers = users.filter(
    (u) =>
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isLoaded || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center gap-4">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
        <span className="text-xs uppercase tracking-widest text-text-muted">Loading Messages...</span>
      </div>
    );
  }

  return (
    <NavigationShell fullBleed>
      <h1 className="sr-only">Messages | JabWeMet</h1>
      <div className="flex h-screen pt-[57px] md:pt-0">

        {/* ─── INBOX SIDEBAR ─── */}
        <aside
          className={`flex-shrink-0 border-r border-white/5 glass-sidebar flex flex-col transition-all duration-300
            ${mobileThreadOpen ? "hidden md:flex" : "flex"}
            w-full md:w-80 lg:w-96`}
        >
          {/* Inbox header */}
          <div className="p-5 border-b border-white/5 space-y-4">
            <h2 className="text-lg font-black text-white tracking-tight">Messages</h2>
            <div className="relative">
              <Search className="w-4 h-4 text-text-faint absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search contacts..."
                className="w-full pl-10 pr-4 py-2.5 text-xs rounded-2xl glass-card text-white placeholder-text-faint input-glow transition-all"
              />
            </div>
          </div>

          {/* Contact list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-none">
            {filteredUsers.length === 0 ? (
              <div className="text-center text-xs text-text-muted p-8 space-y-3">
                <MessageSquare className="w-8 h-8 mx-auto text-text-faint" />
                <p>No contacts found.</p>
              </div>
            ) : (
              filteredUsers.map((profile) => {
                const isActive = activeRecipient?.userId === profile.userId;
                return (
                  <button
                    key={profile.userId}
                    onClick={() => handleSelectUser(profile)}
                    className={`w-full text-left p-3.5 rounded-2xl flex items-center gap-3 transition-all duration-200 ${
                      isActive ? "bg-primary/15 border border-primary/25 text-white" : "hover:bg-white/5 text-text-secondary hover:text-white"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                      isActive ? "bg-primary/30 text-primary" : "bg-white/8 text-text-secondary"
                    }`}>
                      {profile.displayName.substring(0, 1).toUpperCase()}
                    </div>
                    <div className="overflow-hidden flex-1">
                      <h4 className="text-sm font-bold truncate text-white">{profile.displayName}</h4>
                      <span className="text-[10px] text-text-muted truncate block">@{profile.username}</span>
                    </div>
                    {isActive && (
                      <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ─── MESSAGING THREAD ─── */}
        <section
          className={`flex-1 flex flex-col overflow-hidden transition-all duration-300
            ${mobileThreadOpen ? "flex" : "hidden md:flex"}`}
        >
          {activeRecipient ? (
            <>
              {/* Thread header */}
              <div className="px-5 py-4 border-b border-white/5 glass-panel flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setMobileThreadOpen(false)}
                    className="md:hidden p-1.5 rounded-xl hover:bg-white/5 text-text-muted hover:text-white transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/30 to-primary-neon/20 flex items-center justify-center text-primary font-bold text-sm">
                    {activeRecipient.displayName.substring(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">{activeRecipient.displayName}</h2>
                    <span className="text-[10px] text-accent font-semibold tracking-wider uppercase">● Online</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-text-muted">
                  {[Phone, Video, Info].map((Icon, i) => (
                    <button key={i} className="p-2 rounded-xl hover:bg-white/5 hover:text-white transition-colors">
                      <Icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Message thread */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 scrollbar-none">
                <AnimatePresence initial={false}>
                  {messages.map((message) => {
                    const isMe = message.senderId === user.id;
                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 12, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 220, damping: 22 }}
                        className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] sm:max-w-[68%] rounded-3xl px-4 py-3 text-sm shadow-md ${
                            isMe
                              ? "bg-gradient-to-br from-primary to-primary-neon text-white rounded-br-lg"
                              : "glass-card text-text-primary rounded-bl-lg"
                          }`}
                        >
                          <p className="break-words leading-relaxed">{message.content}</p>
                          <span className="block text-[9px] opacity-50 text-right mt-1.5 font-medium">
                            {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}

                  {isTyping && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex justify-start">
                      <div className="glass-card rounded-3xl rounded-bl-lg px-5 py-3.5 flex items-center gap-1.5">
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div ref={messagesEndRef} />
              </div>

              {/* Message input */}
              <form
                onSubmit={handleSendMessage}
                className="p-4 border-t border-white/5 glass-panel flex items-center gap-3 flex-shrink-0"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-3 rounded-2xl glass-card text-white placeholder-text-faint text-sm input-glow transition-all"
                />
                <button
                  type="submit"
                  className="p-3 rounded-2xl bg-primary hover:bg-primary-hover text-white transition-all shadow-glow-sm flex items-center justify-center flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="space-y-4"
              >
                <div className="w-18 h-18 rounded-3xl bg-primary/12 border border-primary/15 flex items-center justify-center text-primary mx-auto p-5">
                  <MessageSquare className="w-10 h-10" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white tracking-tight">Select a conversation</h2>
                  <p className="text-sm text-text-muted mt-1.5 leading-relaxed max-w-xs">
                    Choose from your contacts on the left to start chatting in real-time.
                  </p>
                </div>
              </motion.div>
            </div>
          )}
        </section>
      </div>
    </NavigationShell>
  );
}
