import { useToastStore } from "@/store/toast";

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 3,
  backoff = 300
): Promise<Response> {
  try {
    const res = await fetch(url, options);

    // 1. Audit Clerk Session Expiration (401 Unauthorized)
    if (res.status === 401) {
      if (typeof window !== "undefined") {
        console.warn("[SESSION EXPIRED] 401 Unauthorized detected. Redirecting...");
        
        // Show friendly toast message before redirecting
        useToastStore.getState().addToast(
          "Your session has expired. Redirecting to sign in...",
          "error"
        );

        // Redirect user to Clerk sign-in page, preserving current URL as redirect target
        setTimeout(() => {
          window.location.href = `/sign-in?redirect_url=${encodeURIComponent(
            window.location.pathname + window.location.search
          )}`;
        }, 1500);
      }
      return res;
    }

    // 2. Exponential Backoff Retry Strategy for transient server failures (5xx and 429)
    if (!res.ok && (res.status >= 500 || res.status === 429) && retries > 0) {
      throw new Error(`Transient HTTP Status ${res.status}`);
    }

    return res;
  } catch (error) {
    if (retries > 0) {
      console.warn(
        `[API RETRY] Fetch failed for ${url}. Retrying in ${backoff}ms... (${retries} attempts remaining). Error:`,
        error
      );
      await new Promise((resolve) => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    throw error;
  }
}
