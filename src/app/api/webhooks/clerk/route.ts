// @ts-ignore
import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  // Retrieve the Webhook secret from environments
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    return new Response("Webhook secret not configured", { status: 500 });
  }

  // Get the headers for SVIX signature verification
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If signature keys are missing, reject
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occurred -- Missing svix headers", {
      status: 400,
    });
  }

  // Get the raw request body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Initialize svix with secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload signature
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occurred -- Signature verification failed", {
      status: 400,
    });
  }

  const { id } = evt.data;
  const eventType = evt.type;

  console.log(`Processing Clerk Webhook: ID=${id}, EventType=${eventType}`);

  // Handle user sync actions
  if (eventType === "user.created" || eventType === "user.updated") {
    const data = evt.data;
    const email = data.email_addresses[0]?.email_address;
    if (!email) {
      return new Response("Missing user email payload", { status: 400 });
    }

    const username = data.username || `user_${id?.substring(0, 8)}`;
    const displayName = [data.first_name, data.last_name].filter(Boolean).join(" ") || username;
    const avatarUrl = data.image_url || "";

    // Synchronize to local PostgreSQL using transaction upserts
    await prisma.$transaction(async (tx) => {
      // Upsert primary user
      const user = await tx.user.upsert({
        where: { id },
        update: { email },
        create: { id, email },
      });

      // Upsert profile mapping details
      await tx.profile.upsert({
        where: { userId: id },
        update: {
          username,
          displayName,
          avatarUrl,
        },
        create: {
          userId: id!,
          username,
          displayName,
          avatarUrl,
        },
      });
    });

    return new Response("User synchronized successfully", { status: 200 });
  }

  if (eventType === "user.deleted") {
    // Delete user from local storage (Cascade deletes automatically purge Profile, Posts, and comments)
    await prisma.user.delete({
      where: { id },
    });
    return new Response("User purged successfully", { status: 200 });
  }

  return new Response("Unhandled event type", { status: 200 });
}
