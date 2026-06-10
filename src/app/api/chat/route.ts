import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ChatService } from "@/modules/chat/services/chat.service";
import { syncUserWithDb } from "@/lib/auth-sync";

// Retrieve direct message logs
export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Ensure user profile exists in database
  await syncUserWithDb(userId);

  const { searchParams } = new URL(request.url);
  const recipientId = searchParams.get("recipientId");

  if (!recipientId) {
    return NextResponse.json({ error: "Missing recipientId parameter" }, { status: 400 });
  }

  try {
    const history = await ChatService.getChatHistory(userId, recipientId, 50);
    return NextResponse.json(history);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Send direct message
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Ensure user profile exists in database
  await syncUserWithDb(userId);

  try {
    const { recipientId, content } = await request.json();
    if (!recipientId || !content) {
      return NextResponse.json({ error: "Missing recipientId or content" }, { status: 400 });
    }

    const message = await ChatService.sendMessage(userId, recipientId, content);
    return NextResponse.json(message);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
