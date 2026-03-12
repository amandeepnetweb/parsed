import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  isTextUIPart,
} from "ai";
import type { UIMessage, CoreMessage } from "ai";
import { auth } from "@/lib/auth";
import { retrieveContext, buildSystemPrompt } from "@/lib/rag";
import { getLLMModel } from "@/lib/ai";
import { db } from "@/lib/database";
import { chats, chatMessages } from "@/db/schema";

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const {
    messages,
    fileIds,
    chatId,
  }: { messages: UIMessage[]; fileIds?: string[]; chatId?: string } =
    await req.json();

  const lastMessage = messages.at(-1);
  const query =
    lastMessage?.parts.filter(isTextUIPart).map((p) => p.text).join("") ?? "";

  if (!query.trim()) {
    return Response.json({ error: "No query provided" }, { status: 400 });
  }

  // Ensure chat record exists in DB
  let resolvedChatId = chatId;
  if (resolvedChatId) {
    const existing = await db
      .select({ id: chats.id })
      .from(chats)
      .where(and(eq(chats.id, resolvedChatId), eq(chats.userId, session.user.id)))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(chats).values({
        id: resolvedChatId,
        userId: session.user.id,
        title: query.slice(0, 100),
      });
    }
  } else {
    const [newChat] = await db
      .insert(chats)
      .values({ userId: session.user.id, title: query.slice(0, 100) })
      .returning({ id: chats.id });
    resolvedChatId = newChat.id;
  }

  // Save user message immediately
  await db.insert(chatMessages).values({
    chatId: resolvedChatId,
    role: "user",
    content: query,
  });

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      // Retrieval happens inside the stream so HTTP response starts before it completes
      const { context, sources } = await retrieveContext(
        query,
        session.user.id,
        { fileIds },
      );

      writer.write({ type: "data-sources", data: sources });

      // Build plain CoreMessages — bypasses convertToModelMessages which generates
      // item_reference blocks from SDK-internal parts that Anthropic rejects
      const coreMessages: CoreMessage[] = messages
        .map((msg) => {
          const text = msg.parts.filter(isTextUIPart).map((p) => p.text).join("");
          if (!text) return null;
          return { role: msg.role as "user" | "assistant", content: text };
        })
        .filter((m): m is CoreMessage => m !== null);

      const result = streamText({
        model: getLLMModel(),
        system: buildSystemPrompt(context),
        messages: coreMessages,
        onFinish: async ({ text }) => {
          await db.insert(chatMessages).values({
            chatId: resolvedChatId!,
            role: "assistant",
            content: text,
            sources: sources.length > 0 ? JSON.stringify(sources) : null,
          });
        },
      });

      writer.merge(result.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({ stream });
}
