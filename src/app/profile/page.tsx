"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import NavigationShell from "@/components/navigation-shell";

export default function ProfileRedirect() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    async function fetchMeAndRedirect() {
      try {
        const res = await fetch("/api/users/me");
        if (!res.ok) {
          throw new Error("Failed to fetch user");
        }
        const data = await res.json();
        if (active) {
          if (data?.profile?.username) {
            router.replace(`/profile/${data.profile.username}`);
          } else {
            // If they don't have a username somehow, go to feed
            router.replace("/feed");
          }
        }
      } catch (err: any) {
        console.error("Error redirecting to profile:", err);
        if (active) {
          router.replace("/feed");
        }
      }
    }

    fetchMeAndRedirect();
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <NavigationShell>
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
        <span className="text-xs uppercase tracking-widest text-text-muted">
          Redirecting to profile...
        </span>
      </div>
    </NavigationShell>
  );
}

