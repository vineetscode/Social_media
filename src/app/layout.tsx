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
  title: "JabWeMet - Modern Social Platform for Gen-Z & Creators",
  description: "Share photos, reels, stories, and chat in real-time on JabWeMet.",
  keywords: ["social media", "creators", "reels", "chat", "genz", "JabWeMet"],
  authors: [{ name: "JabWeMet" }],
  openGraph: {
    title: "JabWeMet - Modern Social Platform for Gen-Z & Creators",
    description: "Share photos, reels, stories, and chat in real-time on JabWeMet.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`dark ${outfit.variable}`}>
        <body className="bg-background text-text-primary antialiased min-h-screen font-sans">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
