import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Feed | JabWeMet",
  description: "Explore your personalized creator and Gen-Z feed on JabWeMet. See posts, share reels, interact with the community, and keep up with stories.",
};

export default function FeedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
