import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ReelService } from "@/modules/post/services/reel.service";
import { syncUserWithDb } from "@/lib/auth-sync";

export async function GET(request: Request) {
  const startTotal = performance.now();
  let startQuery = 0;
  let endQuery = 0;
  let startAuth = 0;
  let endAuth = 0;
  let queryCount = 0;

  try {
    startAuth = performance.now();
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await syncUserWithDb(userId);
    endAuth = performance.now();

    startQuery = performance.now();
    const reels = await ReelService.getReels(userId, 15);
    queryCount += 1;
    endQuery = performance.now();

    const startSerialization = performance.now();
    const responseBody = JSON.stringify(reels);
    const endSerialization = performance.now();

    const endTotal = performance.now();

    console.log(
      `[PERF LOG] GET /api/reels | ` +
      `Total: ${(endTotal - startTotal).toFixed(2)}ms | ` +
      `Auth: ${(endAuth - startAuth).toFixed(2)}ms | ` +
      `Query: ${(endQuery - startQuery).toFixed(2)}ms (count: ${queryCount}) | ` +
      `Serialization: ${(endSerialization - startSerialization).toFixed(2)}ms`
    );

    return new NextResponse(responseBody, {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    const endTotal = performance.now();
    console.error(`[PERF LOG ERROR] GET /api/reels | Total: ${(endTotal - startTotal).toFixed(2)}ms |`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const startTotal = performance.now();
  let startQuery = 0;
  let endQuery = 0;
  let startAuth = 0;
  let endAuth = 0;
  let queryCount = 0;

  try {
    startAuth = performance.now();
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await syncUserWithDb(userId);
    endAuth = performance.now();

    const { caption, mediaUrl } = await request.json();
    if (!mediaUrl) {
      return NextResponse.json({ error: "mediaUrl is required" }, { status: 400 });
    }

    startQuery = performance.now();
    const reel = await ReelService.createReel(userId, caption, mediaUrl);
    queryCount += 1;
    endQuery = performance.now();

    const startSerialization = performance.now();
    const responseBody = JSON.stringify(reel);
    const endSerialization = performance.now();

    const endTotal = performance.now();

    console.log(
      `[PERF LOG] POST /api/reels | ` +
      `Total: ${(endTotal - startTotal).toFixed(2)}ms | ` +
      `Auth: ${(endAuth - startAuth).toFixed(2)}ms | ` +
      `Query: ${(endQuery - startQuery).toFixed(2)}ms (count: ${queryCount}) | ` +
      `Serialization: ${(endSerialization - startSerialization).toFixed(2)}ms`
    );

    return new NextResponse(responseBody, {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    const endTotal = performance.now();
    console.error(`[PERF LOG ERROR] POST /api/reels | Total: ${(endTotal - startTotal).toFixed(2)}ms |`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
