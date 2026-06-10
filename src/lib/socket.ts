import { io } from "socket.io-client";

// Client-side socket initialization helper (singleton)
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

export const getSocket = (userId: string) => {
  return io(SOCKET_URL, {
    autoConnect: false,
    query: { userId },
    transports: ["websocket"],
  });
};

// Server-side types representation
export interface ChatSocketMessage {
  roomId: string;
  senderId: string;
  recipientId: string;
  content?: string;
  mediaUrl?: string;
}

export interface TypingStatus {
  roomId: string;
  userId: string;
  isTyping: boolean;
}
