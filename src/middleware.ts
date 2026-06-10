import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Match paths that are accessible without authentication
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks/clerk(.*)"
]);

export default clerkMiddleware(async (auth, request) => {
  const session = await auth();

  // If user is logged in and accesses the root path, redirect to feed page
  if (session.userId && request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/feed", request.url));
  }

  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:html|css|js|json|jpe?g|webp|png|gif|svg|ttf|woff2?|ico)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
