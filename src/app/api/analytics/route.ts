import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Analytics } from "@/lib/analytics";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    const { eventType, payload } = await request.json();
    
    if (!eventType) {
      return NextResponse.json({ error: "Missing eventType" }, { status: 400 });
    }

    // Async track
    await Analytics.track(userId || null, eventType, payload);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[POST /api/analytics Error]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
