import { create } from "zustand";

interface UserSession {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  role: string;
}

interface JabWeMetState {
  // Authentication & User Session
  user: UserSession | null;
  isAuthenticated: boolean;
  setUser: (user: UserSession | null) => void;

  // Real-Time Chat System State
  activeRoomId: string | null;
  setActiveRoomId: (roomId: string | null) => void;
  onlineUsers: string[]; // List of userIds online
  setOnlineUsers: (users: string[]) => void;

  // Notifications State
  unreadNotificationsCount: number;
  incrementUnreadCount: () => void;
  resetUnreadCount: () => void;
}

export const useAppStore = create<JabWeMetState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),

  activeRoomId: null,
  setActiveRoomId: (activeRoomId) => set({ activeRoomId }),
  onlineUsers: [],
  setOnlineUsers: (onlineUsers) => set({ onlineUsers }),

  unreadNotificationsCount: 0,
  incrementUnreadCount: () => set((state) => ({ unreadNotificationsCount: state.unreadNotificationsCount + 1 })),
  resetUnreadCount: () => set({ unreadNotificationsCount: 0 }),
}));
