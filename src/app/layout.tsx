import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "JabWeMet - Next-Gen Social Media for Gen-Z & Creators",
  description: "JabWeMet is a next-generation social ecosystem designed for Gen-Z and digital creators. Share your stories, post interactive reels, connect in real-time chat, and engage with a vibrant creator community in a gorgeous dark-mode playground.",
  keywords: ["social media", "creators", "reels", "chat", "genz", "JabWeMet", "stories"],
  authors: [{ name: "JabWeMet" }],
  openGraph: {
    title: "JabWeMet - Next-Gen Social Media for Gen-Z & Creators",
    description: "JabWeMet is a next-generation social ecosystem designed for Gen-Z and digital creators. Share your stories, post interactive reels, connect in real-time chat, and engage with a vibrant creator community in a gorgeous dark-mode playground.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "pk_test_dGhlLXNhbmRib3gtZmFsbGJhY2stMTIuY2xlcmsuYWNjb3VudHMuZGV2JA"}>
      <html lang="en" className={`dark ${outfit.variable}`}>
        <body className="bg-background text-text-primary antialiased min-h-screen font-sans">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
