import { eq, and, lt, desc } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/database";
import { chats, chatMessages } from "@/db/schema";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [chat] = await db
    .select({ id: chats.id })
    .from(chats)
    .where(and(eq(chats.id, id), eq(chats.userId, session.user.id)))
    .limit(1);

  if (!chat) return Response.json({ error: "Not found" }, { status: 404 });

  const url = new URL(req.url);
  const before = url.searchParams.get("before");
  const limit = 20;

  const condition = before
    ? and(eq(chatMessages.chatId, id), lt(chatMessages.createdAt, new Date(before)))
    : eq(chatMessages.chatId, id);

  const rows = await db
    .select()
    .from(chatMessages)
    .where(condition)
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const messages = rows.slice(0, limit).reverse();

  return Response.json({ messages, hasMore });
}
