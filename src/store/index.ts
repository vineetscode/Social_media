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

  // Notifications & Messages Counts
  unreadNotificationsCount: number;
  unreadMessagesCount: number;
  countsLoaded: boolean;
  setCounts: (notifications: number, messages: number) => void;
  incrementUnreadCount: () => void;
  resetUnreadCount: () => void;
  setUnreadMessagesCount: (count: number) => void;
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
  unreadMessagesCount: 0,
  countsLoaded: false,
  setCounts: (unreadNotificationsCount, unreadMessagesCount) =>
    set({ unreadNotificationsCount, unreadMessagesCount, countsLoaded: true }),
  incrementUnreadCount: () => set((state) => ({ unreadNotificationsCount: state.unreadNotificationsCount + 1 })),
  resetUnreadCount: () => set({ unreadNotificationsCount: 0 }),
  setUnreadMessagesCount: (unreadMessagesCount) => set({ unreadMessagesCount }),
}));
