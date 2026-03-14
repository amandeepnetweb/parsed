import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  isTextUIPart,
} from "ai";
import type { UIMessage, ModelMessage } from "ai";
import { auth } from "@/lib/auth";
import { retrieveContext, buildSystemPrompt } from "@/lib/rag";
import { getLLMModel } from "@/lib/ai";
import { db } from "@/lib/database";
import { chats, chatMessages } from "@/db/schema";

const MAX_HISTORY_MESSAGES = 8;

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

  // Parallelize: retrieval (embed + Pinecone) and DB setup (chat record + user message)
  const [{ context, sources }, resolvedChatId] = await Promise.all([
    retrieveContext(query, session.user.id, { fileIds }),
    (async () => {
      let id = chatId;
      if (id) {
        const existing = await db
          .select({ id: chats.id })
          .from(chats)
          .where(and(eq(chats.id, id), eq(chats.userId, session.user.id)))
          .limit(1);
        if (existing.length === 0) {
          await db.insert(chats).values({
            id,
            userId: session.user.id,
            title: query.slice(0, 100),
          });
        }
      } else {
        const [newChat] = await db
          .insert(chats)
          .values({ userId: session.user.id, title: query.slice(0, 100) })
          .returning();
        id = newChat.id;
      }
      await db.insert(chatMessages).values({
        chatId: id!,
        role: "user",
        content: query,
      });
      return id!;
    })(),
  ]);

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      writer.write({ type: "data-sources", data: sources });

      // Trim to last N messages to keep Claude input small
      const coreMessages = messages
        .slice(-MAX_HISTORY_MESSAGES)
        .flatMap((msg) => {
          const text = msg.parts.filter(isTextUIPart).map((p) => p.text).join("");
          if (!text) return [];
          return [{ role: msg.role as "user" | "assistant", content: text }];
        }) as ModelMessage[];

      const result = streamText({
        model: getLLMModel(),
        system: buildSystemPrompt(context),
        messages: coreMessages,
        onFinish: async ({ text }) => {
          await db.insert(chatMessages).values({
            chatId: resolvedChatId,
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
