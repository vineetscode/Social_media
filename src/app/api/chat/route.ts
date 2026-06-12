import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ChatService } from "@/modules/chat/services/chat.service";
import { syncUserWithDb } from "@/lib/auth-sync";

// Retrieve direct message logs
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

    // Ensure user profile exists in database
    await syncUserWithDb(userId);
    endAuth = performance.now();

    const { searchParams } = new URL(request.url);
    const recipientId = searchParams.get("recipientId");

    if (!recipientId) {
      return NextResponse.json({ error: "Missing recipientId parameter" }, { status: 400 });
    }

    startQuery = performance.now();
    const [history] = await Promise.all([
      ChatService.getChatHistory(userId, recipientId, 50),
      ChatService.markAsRead(userId, recipientId),
    ]);
    queryCount += 2;
    endQuery = performance.now();

    const startSerialization = performance.now();
    const responseBody = JSON.stringify(history);
    const endSerialization = performance.now();

    const endTotal = performance.now();

    console.log(
      `[PERF LOG] GET /api/chat | ` +
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
    console.error(`[PERF LOG ERROR] GET /api/chat | Total: ${(endTotal - startTotal).toFixed(2)}ms |`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Send direct message
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

    // Ensure user profile exists in database
    await syncUserWithDb(userId);
    endAuth = performance.now();

    const { recipientId, content } = await request.json();
    if (!recipientId || !content) {
      return NextResponse.json({ error: "Missing recipientId or content" }, { status: 400 });
    }

    startQuery = performance.now();
    const message = await ChatService.sendMessage(userId, recipientId, content);
    queryCount += 4; // Block check (1) + create message (1) + create notification (2)
    endQuery = performance.now();

    const startSerialization = performance.now();
    const responseBody = JSON.stringify(message);
    const endSerialization = performance.now();

    const endTotal = performance.now();

    console.log(
      `[PERF LOG] POST /api/chat | ` +
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
    console.error(`[PERF LOG ERROR] POST /api/chat | Total: ${(endTotal - startTotal).toFixed(2)}ms |`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
